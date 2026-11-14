'use client';

import {
  BadgeCheck,
  CalendarClock,
  Clock3,
  CreditCard,
  Fuel,
  Loader2,
  Pencil,
  QrCode,
  Receipt,
  Trash2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { PixQrDialog } from '@/components/pix-qr-dialog';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  formatBRL,
  formatDateTime,
  formatFuelQuantity,
  formatKm,
  formatPaymentMethod,
  formatProfitPerKm,
  formatUnitPrice,
} from '@/lib/format';
import { createClient } from '@/lib/supabase/client';
import type { Ride } from '@/lib/supabase/types';
import { cn, getErrorMessage } from '@/lib/utils';

interface RideCardProps {
  ride: Ride;
  /** Atualiza a lista pai após excluir. */
  onDeleted?: (id: string) => void;
  /** Recarrega a lista após confirmar um pagamento PIX. */
  onChanged?: () => void;
}

export function RideCard({ ride, onDeleted, onChanged }: RideCardProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pixOpen, setPixOpen] = useState(false);

  // Exclusão em dois toques: o primeiro arma o botão por 4 segundos.
  useEffect(() => {
    if (!confirmingDelete) return;
    const timer = setTimeout(() => setConfirmingDelete(false), 4000);
    return () => clearTimeout(timer);
  }, [confirmingDelete]);

  const distance =
    ride.distance_km ??
    (ride.km_final !== null ? ride.km_final - ride.km_initial : null);
  const hasLoss = ride.profit < 0;
  const isPaid = ride.payment_status === 'pago';

  async function handleDelete() {
    if (deleting) return;
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }

    setDeleting(true);

    try {
      const { error } = await createClient()
        .from('rides')
        .delete()
        .eq('id', ride.id);
      if (error) throw error;

      toast.success('Corrida excluída.');
      onDeleted?.(ride.id);
    } catch (error) {
      toast.error('Não foi possível excluir', {
        description: getErrorMessage(error, 'Tente novamente.'),
      });
      setConfirmingDelete(false);
      setDeleting(false);
    }
  }

  return (
    <article className="animate-fade-in rounded-2xl border bg-card p-4 shadow-card sm:p-5">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-bold text-foreground">
            <CalendarClock
              className="size-4 shrink-0 text-primary dark:text-foreground"
              aria-hidden="true"
            />
            {formatDateTime(ride.ride_at)}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Fuel className="size-3.5 shrink-0" aria-hidden="true" />
              {formatFuelQuantity(ride.fuel_quantity, ride.fuel_type)} ·{' '}
              {formatUnitPrice(ride.fuel_unit_price, ride.fuel_type)}
            </span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1.5">
              {ride.payment_method === 'cartao' ? (
                <CreditCard className="size-3.5" aria-hidden="true" />
              ) : ride.payment_method === 'pix' ? (
                <QrCode className="size-3.5" aria-hidden="true" />
              ) : (
                <Receipt className="size-3.5" aria-hidden="true" />
              )}
              {formatPaymentMethod(ride.payment_method)}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5">
          <p
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-extrabold tabular-nums',
              hasLoss
                ? 'bg-red-100 text-red-900 dark:bg-red-950/50 dark:text-red-200'
                : 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200',
            )}
          >
            {hasLoss ? (
              <TrendingDown className="size-4 shrink-0" aria-hidden="true" />
            ) : (
              <TrendingUp className="size-4 shrink-0" aria-hidden="true" />
            )}
            {formatBRL(ride.profit)}
          </p>
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold',
              isPaid
                ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200'
                : 'bg-amber-100 text-amber-950 dark:bg-amber-950/50 dark:text-amber-100',
            )}
          >
            {isPaid ? (
              <BadgeCheck className="size-3.5" aria-hidden="true" />
            ) : (
              <Clock3 className="size-3.5" aria-hidden="true" />
            )}
            {isPaid ? 'Pago' : 'Aguardando PIX'}
          </span>
        </div>
      </header>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Recebido
          </dt>
          <dd className="mt-0.5 text-sm font-bold tabular-nums">
            {formatBRL(ride.fare)}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Combustível
          </dt>
          <dd className="mt-0.5 text-sm font-bold tabular-nums">
            {formatBRL(ride.fuel_cost)}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Outras despesas
          </dt>
          <dd className="mt-0.5 text-sm font-bold tabular-nums">
            {formatBRL(ride.extra_expenses)}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            KM rodados
          </dt>
          <dd className="mt-0.5 text-sm font-bold tabular-nums">
            {distance === null ? (
              <span className="font-normal text-muted-foreground">
                sem KM final
              </span>
            ) : (
              <>
                {formatKm(distance)}
                {distance > 0 ? (
                  <span className="ml-1 font-normal text-muted-foreground">
                    ({formatProfitPerKm(ride.profit / distance)})
                  </span>
                ) : null}
              </>
            )}
          </dd>
        </div>
      </dl>

      {ride.notes ? (
        <p className="mt-3 rounded-lg bg-secondary/70 p-3 text-xs leading-relaxed text-muted-foreground">
          {ride.notes}
        </p>
      ) : null}

      <footer className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t pt-3">
        {!isPaid ? (
          <Button
            variant="accent"
            size="sm"
            onClick={() => setPixOpen(true)}
            className="mr-auto"
          >
            <QrCode aria-hidden="true" />
            Cobrar PIX
          </Button>
        ) : null}

        <Link
          href={`/corrida/${ride.id}`}
          className={cn(
            buttonVariants({ variant: 'outline', size: 'sm' }),
            'text-primary hover:text-accent dark:text-foreground',
          )}
        >
          <Pencil aria-hidden="true" />
          Editar
        </Link>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDelete}
          disabled={deleting}
          className={cn(
            'text-destructive hover:bg-red-50 hover:text-destructive dark:hover:bg-red-950/40',
            confirmingDelete &&
              'border-destructive bg-destructive text-destructive-foreground hover:bg-destructive hover:text-destructive-foreground',
          )}
        >
          {deleting ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <Trash2 aria-hidden="true" />
          )}
          {confirmingDelete ? 'Confirmar exclusão' : 'Excluir'}
        </Button>
      </footer>

      <PixQrDialog
        charge={{
          id: ride.id,
          fare: ride.fare,
          pix_txid: ride.pix_txid,
          payment_status: ride.payment_status,
        }}
        open={pixOpen}
        onClose={() => setPixOpen(false)}
        onConfirmed={() => {
          setPixOpen(false);
          onChanged?.();
        }}
      />
    </article>
  );
}
