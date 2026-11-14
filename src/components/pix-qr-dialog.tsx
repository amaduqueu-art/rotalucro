'use client';

import {
  BadgeCheck,
  Check,
  Copy,
  Download,
  Loader2,
  QrCode,
  ShieldCheck,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { BRAND, formatPixKey } from '@/lib/brand';
import { formatBRL } from '@/lib/format';
import { buildPixPayload, createPixTxid } from '@/lib/pix';
import { createClient } from '@/lib/supabase/client';
import type { PaymentStatus } from '@/lib/supabase/types';
import { cn, getErrorMessage } from '@/lib/utils';

export interface PixCharge {
  id: string;
  fare: number;
  pix_txid: string | null;
  payment_status: PaymentStatus;
}

interface PixQrDialogProps {
  charge: PixCharge | null;
  open: boolean;
  onClose: () => void;
  /** Chamado depois que o motorista confirma o recebimento. */
  onConfirmed?: () => void;
}

/**
 * Mostra o QR Code PIX (estático) da corrida e permite confirmar o pagamento.
 *
 * Importante: o QR estático não envia callback para o app. O motorista confere
 * o crédito no banco e toca em "Já recebi o pagamento" — aí o status vira
 * `pago` e a mensagem de confirmação aparece.
 */
export function PixQrDialog({
  charge,
  open,
  onClose,
  onConfirmed,
}: PixQrDialogProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [paid, setPaid] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const fallbackTxid = useMemo(
    () => createPixTxid(charge?.id ?? ''),
    [charge?.id],
  );
  const txid = charge?.pix_txid ?? fallbackTxid;

  const payload = useMemo(
    () => (charge ? buildPixPayload({ amount: charge.fare, txid }) : ''),
    [charge, txid],
  );

  useEffect(() => {
    if (!open || !charge) {
      setDataUrl(null);
      setQrError(null);
      return;
    }

    setPaid(charge.payment_status === 'pago');
    setCopied(false);
    setQrError(null);
    setDataUrl(null);

    let active = true;

    void (async () => {
      try {
        const { default: QRCode } = await import('qrcode');
        const url = await QRCode.toDataURL(payload, {
          width: 360,
          margin: 1,
          errorCorrectionLevel: 'M',
          color: { dark: '#102a47', light: '#ffffff' },
        });

        if (active) setDataUrl(url);
      } catch {
        if (active) {
          setQrError(
            'Não foi possível desenhar o QR Code. Use o código copia e cola abaixo.',
          );
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [open, charge, payload]);

  async function handleCopy() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(payload);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = payload;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
      }

      setCopied(true);
      toast.success('Código PIX copiado!', {
        description: 'Cole no aplicativo do seu banco para receber.',
      });
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Não foi possível copiar', {
        description: 'Selecione o código abaixo e copie manualmente.',
      });
    }
  }

  async function handleConfirmPayment() {
    if (!charge || confirming || paid) return;

    setConfirming(true);

    try {
      const { error } = await createClient()
        .from('rides')
        .update({
          payment_method: 'pix',
          payment_status: 'pago',
          paid_at: new Date().toISOString(),
          pix_txid: txid,
        })
        .eq('id', charge.id);

      if (error) throw error;

      setPaid(true);
      toast.success('Pagamento confirmado!', {
        description: `${formatBRL(charge.fare)} recebidos via PIX. Bom trabalho!`,
      });
      onConfirmed?.();
    } catch (error) {
      toast.error('Não foi possível confirmar o pagamento', {
        description: getErrorMessage(error, 'Tente novamente em instantes.'),
      });
    } finally {
      setConfirming(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={paid ? 'Pagamento confirmado' : 'Cobrar via PIX'}
      description={
        paid
          ? undefined
          : 'Mostre o QR Code ou envie o código copia e cola para o passageiro.'
      }
    >
      {!charge ? null : paid ? (
        <div className="space-y-5">
          <div
            role="status"
            aria-live="polite"
            className="flex flex-col items-center gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 p-6 text-center text-emerald-950 dark:border-emerald-700/60 dark:bg-emerald-950/40 dark:text-emerald-100"
          >
            <span className="flex size-14 items-center justify-center rounded-full bg-emerald-600 text-white">
              <BadgeCheck className="size-8" aria-hidden="true" />
            </span>
            <p className="text-lg font-extrabold">Pagamento confirmado!</p>
            <p className="text-sm leading-relaxed">
              {formatBRL(charge.fare)} recebidos via PIX para{' '}
              <strong>{BRAND.owner}</strong>.
            </p>
            <p className="text-xs opacity-80">
              A corrida ficou marcada como paga no seu histórico.
            </p>
          </div>

          <Button variant="accent" size="lg" className="w-full" onClick={onClose}>
            <Check aria-hidden="true" />
            Concluir
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-secondary/50 p-4 text-center">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Valor da corrida
            </p>
            <p className="mt-1 text-3xl font-extrabold tabular-nums tracking-tight text-foreground">
              {formatBRL(charge.fare)}
            </p>
          </div>

          <div className="mx-auto flex w-fit items-center justify-center rounded-2xl border border-border bg-white p-3 shadow-card">
            {dataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- QR gerado no cliente
              <img
                src={dataUrl}
                alt={`QR Code PIX de ${formatBRL(charge.fare)} para ${BRAND.owner}`}
                width={224}
                height={224}
                className="size-56"
              />
            ) : qrError ? (
              <p className="flex size-56 items-center justify-center p-4 text-center text-sm text-red-700">
                {qrError}
              </p>
            ) : (
              <div className="flex size-56 items-center justify-center text-muted-foreground">
                <QrCode className="size-10 animate-pulse" aria-hidden="true" />
                <span className="sr-only">Gerando QR Code</span>
              </div>
            )}
          </div>

          <div className="space-y-1 text-center text-sm">
            <p className="font-bold text-foreground">{BRAND.pix.merchantName}</p>
            <p className="text-muted-foreground">
              Chave PIX ({BRAND.pix.keyType}): {formatPixKey()}
            </p>
          </div>

          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              PIX copia e cola
            </span>
            <textarea
              readOnly
              value={payload}
              rows={3}
              onFocus={(event) => event.currentTarget.select()}
              className="w-full resize-none rounded-lg border border-input bg-secondary/40 p-3 font-mono text-xs leading-relaxed text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Código PIX copia e cola"
            />
          </label>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => void handleCopy()}>
              {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
              {copied ? 'Copiado' : 'Copiar'}
            </Button>
            <a
              href={dataUrl ?? '#'}
              download={`pix-${txid}.png`}
              aria-disabled={!dataUrl}
              className={cn(
                'inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-input bg-card px-3 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                !dataUrl && 'pointer-events-none opacity-50',
              )}
            >
              <Download aria-hidden="true" />
              Baixar QR
            </a>
          </div>

          <Button
            variant="accent"
            size="lg"
            className="w-full"
            onClick={() => void handleConfirmPayment()}
            disabled={confirming}
          >
            {confirming ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <BadgeCheck aria-hidden="true" />
            )}
            {confirming ? 'Confirmando...' : 'Já recebi o pagamento'}
          </Button>

          <p className="flex items-start justify-center gap-1.5 text-center text-xs leading-relaxed text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            Confirme somente depois de verificar o crédito no aplicativo do seu
            banco. O QR Code é estático e não avisa o app automaticamente.
          </p>
        </div>
      )}
    </Modal>
  );
}
