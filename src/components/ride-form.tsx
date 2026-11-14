'use client';

import {
  AlertTriangle,
  Banknote,
  Check,
  CreditCard,
  Fuel,
  Gauge,
  Loader2,
  Lock,
  Mic,
  MicOff,
  QrCode,
  Receipt,
  Send,
  Smartphone,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState, type FormEvent } from 'react';
import { toast } from 'sonner';

import { PixQrDialog, type PixCharge } from '@/components/pix-qr-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';
import { BRAND, formatPixKey } from '@/lib/brand';
import { computeRideMetrics, parseDecimal, round } from '@/lib/calc';
import {
  FUEL_OPTIONS,
  LIMITS,
  PAYMENT_OPTIONS,
  getFuelOption,
} from '@/lib/constants';
import {
  formatBRL,
  formatConsumption,
  formatFuelQuantity,
  formatKm,
  formatProfitPerKm,
  formatUnitPrice,
  parseDatetimeLocal,
  toDatetimeLocalValue,
} from '@/lib/format';
import { createPixTxid } from '@/lib/pix';
import { createClient } from '@/lib/supabase/client';
import type {
  FuelType,
  PaymentMethod,
  PaymentStatus,
  Ride,
} from '@/lib/supabase/types';
import { cn, getErrorMessage } from '@/lib/utils';

type FieldName =
  | 'rideAt'
  | 'fare'
  | 'paymentMethod'
  | 'fuelType'
  | 'fuelQuantity'
  | 'fuelUnitPrice'
  | 'kmInitial'
  | 'kmFinal'
  | 'extraExpenses'
  | 'notes';

type FieldErrors = Partial<Record<FieldName, string>>;

const PAYMENT_ICONS = {
  dinheiro: Banknote,
  cartao: CreditCard,
  pix: QrCode,
  aplicativo: Smartphone,
} as const;

interface RideFormProps {
  /** Quando informado, o formulário edita a corrida existente. */
  ride?: Ride;
}

export function RideForm({ ride }: RideFormProps) {
  const router = useRouter();
  const isEdit = Boolean(ride);

  const [rideAt, setRideAt] = useState(() =>
    toDatetimeLocalValue(ride ? new Date(ride.ride_at) : new Date()),
  );
  const [fare, setFare] = useState(ride ? String(ride.fare) : '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    ride?.payment_method ?? 'dinheiro',
  );
  const [fuelType, setFuelType] = useState<FuelType | ''>(
    ride?.fuel_type ?? '',
  );
  const [fuelQuantity, setFuelQuantity] = useState(
    ride ? String(ride.fuel_quantity) : '',
  );
  const [fuelUnitPrice, setFuelUnitPrice] = useState(
    ride ? String(ride.fuel_unit_price) : '',
  );
  const [kmInitial, setKmInitial] = useState(
    ride ? String(ride.km_initial) : '',
  );
  const [kmFinal, setKmFinal] = useState(
    ride?.km_final !== null && ride?.km_final !== undefined
      ? String(ride.km_final)
      : '',
  );
  const [extraExpenses, setExtraExpenses] = useState(
    ride ? String(ride.extra_expenses) : '',
  );
  const [notes, setNotes] = useState(ride?.notes ?? '');

  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [savedCharge, setSavedCharge] = useState<PixCharge | null>(null);
  const [askQrOpen, setAskQrOpen] = useState(false);
  const [pixOpen, setPixOpen] = useState(false);
  const [generatingQr, setGeneratingQr] = useState(false);

  const rideAtRef = useRef<HTMLInputElement>(null);
  const fareRef = useRef<HTMLInputElement>(null);
  const fuelTypeRef = useRef<HTMLDivElement>(null);
  const fuelQuantityRef = useRef<HTMLInputElement>(null);
  const fuelUnitPriceRef = useRef<HTMLInputElement>(null);
  const kmInitialRef = useRef<HTMLInputElement>(null);
  const kmFinalRef = useRef<HTMLInputElement>(null);
  const extraExpensesRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  const selectedFuel = fuelType ? getFuelOption(fuelType) : null;

  const metrics = useMemo(
    () =>
      computeRideMetrics({
        fare: parseDecimal(fare),
        fuelQuantity: parseDecimal(fuelQuantity),
        fuelUnitPrice: parseDecimal(fuelUnitPrice),
        extraExpenses: parseDecimal(extraExpenses),
        kmInitial: parseDecimal(kmInitial),
        kmFinal: parseDecimal(kmFinal),
      }),
    [fare, fuelQuantity, fuelUnitPrice, extraExpenses, kmInitial, kmFinal],
  );

  const speech = useSpeechRecognition({
    onAmount: (value) => {
      setFare(value.toFixed(2));
      clearError('fare');
      toast.success('Valor reconhecido', {
        description: formatBRL(value),
      });
    },
  });

  function clearError(field: FieldName) {
    setErrors((previous) => {
      if (!previous[field]) return previous;
      const next = { ...previous };
      delete next[field];
      return next;
    });
  }

  function handleFuelTypeChange(next: FuelType | '') {
    const previousDefault = fuelType
      ? getFuelOption(fuelType).defaultUnitPrice
      : null;
    const currentPrice = parseDecimal(fuelUnitPrice);

    setFuelType(next);
    clearError('fuelType');

    if (!next) return;

    const option = getFuelOption(next);
    const untouched =
      fuelUnitPrice.trim() === '' ||
      (previousDefault !== null && currentPrice === previousDefault);

    if (untouched) {
      setFuelUnitPrice(option.defaultUnitPrice.toFixed(3));
      clearError('fuelUnitPrice');
    }
  }

  function validate(): boolean {
    const nextErrors: FieldErrors = {};

    const rideAtDate = parseDatetimeLocal(rideAt);
    if (!rideAt || Number.isNaN(rideAtDate.getTime())) {
      nextErrors.rideAt = 'Informe a data e a hora da corrida.';
    }

    const fareValue = parseDecimal(fare);
    if (fareValue === null) {
      nextErrors.fare = 'Informe o valor recebido pela corrida.';
    } else if (fareValue <= 0) {
      nextErrors.fare = 'O valor recebido deve ser maior que zero.';
    } else if (fareValue > LIMITS.fareMax) {
      nextErrors.fare = 'O valor recebido parece alto demais. Confira.';
    }

    if (!paymentMethod) {
      nextErrors.paymentMethod = 'Escolha como a corrida foi paga.';
    }

    if (!fuelType) {
      nextErrors.fuelType = 'Selecione o tipo de combustível.';
    }

    const fuelQuantityValue = parseDecimal(fuelQuantity);
    if (fuelQuantityValue === null) {
      nextErrors.fuelQuantity = 'Informe a quantidade abastecida.';
    } else if (fuelQuantityValue <= 0) {
      nextErrors.fuelQuantity = 'A quantidade deve ser maior que zero.';
    } else if (fuelQuantityValue > LIMITS.fuelQuantityMax) {
      nextErrors.fuelQuantity = 'A quantidade parece alta demais. Confira.';
    }

    const fuelUnitPriceValue = parseDecimal(fuelUnitPrice);
    if (fuelUnitPriceValue === null) {
      nextErrors.fuelUnitPrice = 'Informe o preço do litro (ou m³).';
    } else if (fuelUnitPriceValue <= 0) {
      nextErrors.fuelUnitPrice = 'O preço deve ser maior que zero.';
    } else if (fuelUnitPriceValue > LIMITS.fuelUnitPriceMax) {
      nextErrors.fuelUnitPrice = 'O preço parece alto demais. Confira.';
    }

    const kmInitialValue = parseDecimal(kmInitial);
    if (kmInitialValue === null) {
      nextErrors.kmInitial = 'Informe a quilometragem inicial.';
    } else if (kmInitialValue < 0) {
      nextErrors.kmInitial = 'A quilometragem não pode ser negativa.';
    } else if (kmInitialValue > LIMITS.kmMax) {
      nextErrors.kmInitial = 'A quilometragem parece alta demais. Confira.';
    }

    const kmFinalValue = parseDecimal(kmFinal);
    if (kmFinalValue !== null) {
      if (kmInitialValue !== null && kmFinalValue < kmInitialValue) {
        nextErrors.kmFinal =
          'O KM final deve ser igual ou maior que o KM inicial.';
      } else if (kmFinalValue > LIMITS.kmMax) {
        nextErrors.kmFinal = 'A quilometragem parece alta demais. Confira.';
      }
    }

    const extraValue = parseDecimal(extraExpenses);
    if (extraValue !== null) {
      if (extraValue < 0) {
        nextErrors.extraExpenses = 'As despesas não podem ser negativas.';
      } else if (extraValue > LIMITS.extraExpensesMax) {
        nextErrors.extraExpenses = 'O valor parece alto demais. Confira.';
      }
    }

    if (notes.length > LIMITS.notesMaxLength) {
      nextErrors.notes = `As observações devem ter no máximo ${LIMITS.notesMaxLength} caracteres.`;
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      const focusMap: ReadonlyArray<[FieldName, React.RefObject<HTMLElement>]> =
        [
          ['rideAt', rideAtRef],
          ['fare', fareRef],
          ['fuelType', fuelTypeRef],
          ['fuelQuantity', fuelQuantityRef],
          ['fuelUnitPrice', fuelUnitPriceRef],
          ['kmInitial', kmInitialRef],
          ['kmFinal', kmFinalRef],
          ['extraExpenses', extraExpensesRef],
          ['notes', notesRef],
        ];

      for (const [field, ref] of focusMap) {
        if (nextErrors[field]) {
          ref.current?.focus();
          break;
        }
      }

      return false;
    }

    return true;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting) return;

    setFormError(null);

    if (!validate()) return;

    setSubmitting(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error(
          'Sua sessão expirou. Entre novamente para salvar a corrida.',
        );
      }

      const quantity = round(parseDecimal(fuelQuantity) ?? 0, 2);
      const unitPrice = round(parseDecimal(fuelUnitPrice) ?? 0, 3);
      const fuelCost = round(quantity * unitPrice, 2);
      const extras = round(parseDecimal(extraExpenses) ?? 0, 2);
      const alreadyPaid = ride?.payment_status === 'pago';

      // Corrida nova em PIX fica aguardando o QR Code; nas demais formas o
      // recebimento é considerado imediato. Ao editar, pagamento já confirmado
      // permanece confirmado.
      const paymentStatus: PaymentStatus = alreadyPaid
        ? 'pago'
        : paymentMethod === 'pix'
          ? 'pendente'
          : 'pago';

      const payload = {
        user_id: user.id,
        ride_at: parseDatetimeLocal(rideAt).toISOString(),
        fare: round(parseDecimal(fare) ?? 0, 2),
        fuel_type: fuelType as FuelType,
        fuel_quantity: quantity,
        fuel_unit_price: unitPrice,
        fuel_cost: fuelCost,
        extra_expenses: extras,
        km_initial: round(parseDecimal(kmInitial) ?? 0, 1),
        km_final:
          parseDecimal(kmFinal) !== null
            ? round(parseDecimal(kmFinal) ?? 0, 1)
            : null,
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        paid_at:
          paymentStatus === 'pago'
            ? (ride?.paid_at ?? new Date().toISOString())
            : null,
        pix_txid:
          paymentMethod === 'pix'
            ? (ride?.pix_txid ?? createPixTxid())
            : null,
        notes: notes.trim() || null,
      };

      let record: Ride;

      if (ride) {
        const { data, error: updateError } = await supabase
          .from('rides')
          .update(payload)
          .eq('id', ride.id)
          .select('*')
          .single();

        if (updateError) throw updateError;
        record = data as Ride;

        toast.success('Corrida atualizada!');
      } else {
        const { data, error: insertError } = await supabase
          .from('rides')
          .insert(payload)
          .select('*')
          .single();

        if (insertError) throw insertError;
        record = data as Ride;

        toast.success('Corrida registrada!', {
          description:
            metrics.profit !== null
              ? `Lucro líquido de ${formatBRL(metrics.profit)}.`
              : 'Confira o lucro no histórico.',
        });
      }

      setSavedCharge({
        id: record.id,
        fare: record.fare,
        pix_txid: record.pix_txid,
        payment_status: record.payment_status,
      });
      setAskQrOpen(true);
    } catch (error) {
      let message = getErrorMessage(
        error,
        'Não foi possível salvar a corrida. Tente novamente.',
      );

      if (message.toLowerCase().includes('row-level security')) {
        message =
          'Sua sessão expirou ou não tem permissão para salvar. Entre novamente.';
      }

      setFormError(message);
      toast.error('Não foi possível salvar a corrida', {
        description: message,
      });
    } finally {
      setSubmitting(false);
    }
  }

  function finish() {
    router.push('/historico');
    router.refresh();
  }

  function handleDeclineQr() {
    setAskQrOpen(false);
    finish();
  }

  async function handleGenerateQr() {
    if (!savedCharge || generatingQr) return;

    setGeneratingQr(true);

    try {
      const txid = savedCharge.pix_txid ?? createPixTxid();

      const { data, error } = await createClient()
        .from('rides')
        .update({
          payment_method: 'pix',
          payment_status: 'pendente',
          pix_txid: txid,
          paid_at: null,
        })
        .eq('id', savedCharge.id)
        .select('id, fare, pix_txid, payment_status')
        .single();

      if (error) throw error;

      setSavedCharge(data as PixCharge);
      setAskQrOpen(false);
      setPixOpen(true);
    } catch (error) {
      toast.error('Não foi possível gerar o QR Code', {
        description: getErrorMessage(error, 'Tente novamente em instantes.'),
      });
    } finally {
      setGeneratingQr(false);
    }
  }

  const profitIsLoss = (metrics.profit ?? 0) < 0;
  const savedAlreadyPaid = savedCharge?.payment_status === 'pago';

  return (
    <>
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {formError ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-red-50 p-4 text-sm text-red-950 dark:bg-red-950/40 dark:text-red-100"
          >
            <AlertTriangle
              className="mt-0.5 size-4 shrink-0 text-destructive"
              aria-hidden="true"
            />
            <p>{formError}</p>
          </div>
        ) : null}

        <fieldset disabled={submitting} className="min-w-0 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="ride-at">
              Data e hora da corrida <span className="text-accent">*</span>
            </Label>
            <Input
              ref={rideAtRef}
              id="ride-at"
              name="ride-at"
              type="datetime-local"
              value={rideAt}
              onChange={(event) => {
                setRideAt(event.target.value);
                clearError('rideAt');
              }}
              aria-required="true"
              aria-invalid={Boolean(errors.rideAt)}
              aria-describedby={errors.rideAt ? 'ride-at-error' : undefined}
              className={cn(errors.rideAt && 'border-destructive')}
            />
            {errors.rideAt ? (
              <p id="ride-at-error" className="field-error">
                {errors.rideAt}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="fare">
              Valor da corrida (R$) <span className="text-accent">*</span>
            </Label>
            <div className="flex gap-2">
              <Input
                ref={fareRef}
                id="fare"
                name="fare"
                type="number"
                inputMode="decimal"
                min="0"
                max={LIMITS.fareMax}
                step="0.01"
                placeholder="Ex.: 85,00"
                value={fare}
                onChange={(event) => {
                  setFare(event.target.value);
                  clearError('fare');
                  speech.clearError();
                }}
                autoComplete="off"
                aria-required="true"
                aria-invalid={Boolean(errors.fare)}
                aria-describedby={errors.fare ? 'fare-error' : 'fare-help'}
                className={cn(errors.fare && 'border-destructive')}
              />
              <Button
                type="button"
                variant={speech.listening ? 'accent' : 'outline'}
                size="icon"
                onClick={speech.toggle}
                disabled={!speech.supported || submitting}
                aria-label={
                  speech.listening
                    ? 'Parar de ouvir o valor da corrida'
                    : 'Ditar o valor da corrida por voz'
                }
                aria-pressed={speech.listening}
                title={
                  speech.supported
                    ? 'Ditar o valor por voz'
                    : 'Entrada por voz indisponível neste navegador'
                }
                className={cn(
                  'size-11 shrink-0',
                  speech.listening && 'animate-pulse',
                )}
              >
                {speech.listening ? (
                  <MicOff className="size-5" aria-hidden="true" />
                ) : (
                  <Mic className="size-5" aria-hidden="true" />
                )}
              </Button>
            </div>
            <p id="fare-help" className="text-xs leading-relaxed text-muted-foreground">
              Quanto o passageiro pagou. Toque no microfone e diga, por
              exemplo: <em>&ldquo;oitenta e cinco reais e cinquenta centavos&rdquo;</em>.
            </p>
            {speech.listening ? (
              <p
                role="status"
                aria-live="polite"
                className="flex items-center gap-2 rounded-lg bg-accent/10 px-3 py-2 text-sm font-semibold text-accent"
              >
                <Mic className="size-4 animate-pulse" aria-hidden="true" />
                {speech.transcript ? `Ouvindo: “${speech.transcript}”` : 'Ouvindo...'}
              </p>
            ) : null}
            {speech.error ? (
              <p role="alert" className="text-xs font-medium text-destructive">
                {speech.error}
              </p>
            ) : null}
            {!speech.supported ? (
              <p className="text-xs text-muted-foreground">
                Entrada por voz indisponível neste navegador (use Chrome, Edge
                ou Safari em uma conexão segura).
              </p>
            ) : null}
            {errors.fare ? (
              <p id="fare-error" className="field-error">
                {errors.fare}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label id="payment-label">
              Corrida paga com <span className="text-accent">*</span>
            </Label>
            <div
              role="radiogroup"
              aria-labelledby="payment-label"
              className="grid grid-cols-2 gap-2"
            >
              {PAYMENT_OPTIONS.map((option) => {
                const active = paymentMethod === option.value;
                const Icon = PAYMENT_ICONS[option.value];

                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => {
                      setPaymentMethod(option.value);
                      clearError('paymentMethod');
                    }}
                    className={cn(
                      'flex min-h-[56px] items-center gap-2.5 rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      active
                        ? 'border-accent bg-accent/10 text-foreground'
                        : 'border-border bg-card hover:bg-secondary',
                    )}
                  >
                    <span
                      className={cn(
                        'flex size-9 shrink-0 items-center justify-center rounded-lg',
                        active
                          ? 'bg-accent text-accent-foreground'
                          : 'bg-secondary text-primary dark:text-foreground',
                      )}
                    >
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-bold">
                        {option.label}
                      </span>
                      <span className="block text-[11px] leading-tight text-muted-foreground">
                        {option.description}
                      </span>
                    </span>
                    {active ? (
                      <Check
                        className="ml-auto size-4 shrink-0 text-accent"
                        aria-hidden="true"
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Se escolher PIX, o app oferece um QR Code para cobrar a corrida
              depois de salvar.
            </p>
            {errors.paymentMethod ? (
              <p className="field-error">{errors.paymentMethod}</p>
            ) : null}
          </div>

          <div ref={fuelTypeRef} className="space-y-2" tabIndex={-1}>
            <Label htmlFor="fuel-type">
              Tipo de combustível <span className="text-accent">*</span>
            </Label>
            <Select
              id="fuel-type"
              name="fuel-type"
              value={fuelType}
              onChange={(event) =>
                handleFuelTypeChange(event.target.value as FuelType | '')
              }
              aria-required="true"
              aria-invalid={Boolean(errors.fuelType)}
              aria-describedby={
                errors.fuelType ? 'fuel-type-error' : 'fuel-type-help'
              }
              className={cn(errors.fuelType && 'border-destructive')}
            >
              <option value="">Selecione o combustível</option>
              {FUEL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <p id="fuel-type-help" className="text-xs text-muted-foreground">
              GNV, Álcool ou Gasolina — a unidade e o preço médio mudam junto.
            </p>
            {errors.fuelType ? (
              <p id="fuel-type-error" className="field-error">
                {errors.fuelType}
              </p>
            ) : null}
          </div>

          {selectedFuel ? (
            <div className="space-y-4 rounded-2xl border border-border bg-secondary/30 p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fuel-quantity">
                    {selectedFuel.quantityLabel}{' '}
                    <span className="text-accent">*</span>
                  </Label>
                  <Input
                    ref={fuelQuantityRef}
                    id="fuel-quantity"
                    name="fuel-quantity"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    max={LIMITS.fuelQuantityMax}
                    step="0.01"
                    placeholder={
                      selectedFuel.value === 'gnv' ? 'Ex.: 12,5' : 'Ex.: 35,2'
                    }
                    value={fuelQuantity}
                    onChange={(event) => {
                      setFuelQuantity(event.target.value);
                      clearError('fuelQuantity');
                    }}
                    autoComplete="off"
                    aria-required="true"
                    aria-invalid={Boolean(errors.fuelQuantity)}
                    aria-describedby={
                      errors.fuelQuantity
                        ? 'fuel-quantity-error'
                        : 'fuel-quantity-help'
                    }
                    className={cn(errors.fuelQuantity && 'border-destructive')}
                  />
                  <p
                    id="fuel-quantity-help"
                    className="text-xs text-muted-foreground"
                  >
                    {selectedFuel.help}
                  </p>
                  {errors.fuelQuantity ? (
                    <p id="fuel-quantity-error" className="field-error">
                      {errors.fuelQuantity}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fuel-unit-price">
                    {selectedFuel.priceLabel}{' '}
                    <span className="text-accent">*</span>
                  </Label>
                  <Input
                    ref={fuelUnitPriceRef}
                    id="fuel-unit-price"
                    name="fuel-unit-price"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    max={LIMITS.fuelUnitPriceMax}
                    step="0.001"
                    placeholder="Ex.: 6,09"
                    value={fuelUnitPrice}
                    onChange={(event) => {
                      setFuelUnitPrice(event.target.value);
                      clearError('fuelUnitPrice');
                    }}
                    autoComplete="off"
                    aria-required="true"
                    aria-invalid={Boolean(errors.fuelUnitPrice)}
                    aria-describedby={
                      errors.fuelUnitPrice
                        ? 'fuel-unit-price-error'
                        : 'fuel-unit-price-help'
                    }
                    className={cn(
                      errors.fuelUnitPrice && 'border-destructive',
                    )}
                  />
                  <p
                    id="fuel-unit-price-help"
                    className="text-xs text-muted-foreground"
                  >
                    Preço médio sugerido:{' '}
                    {formatUnitPrice(
                      selectedFuel.defaultUnitPrice,
                      selectedFuel.value,
                    )}
                    . Ajuste para o valor da bomba.
                  </p>
                  {errors.fuelUnitPrice ? (
                    <p id="fuel-unit-price-error" className="field-error">
                      {errors.fuelUnitPrice}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap items-end justify-between gap-2 rounded-xl border border-accent/30 bg-accent/5 p-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    Custo do combustível (calculado)
                  </p>
                  <p
                    className="mt-0.5 text-2xl font-extrabold tabular-nums text-foreground"
                    aria-live="polite"
                  >
                    {formatBRL(metrics.fuelCost)}
                  </p>
                </div>
                <p className="text-xs font-medium text-muted-foreground">
                  {parseDecimal(fuelQuantity) !== null &&
                  parseDecimal(fuelUnitPrice) !== null
                    ? `${formatFuelQuantity(
                        parseDecimal(fuelQuantity) ?? 0,
                        selectedFuel.value,
                      )} × ${formatUnitPrice(
                        parseDecimal(fuelUnitPrice) ?? 0,
                        selectedFuel.value,
                      )}`
                    : 'Informe quantidade e preço para calcular'}
                </p>
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="km-initial">
                Quilometragem inicial (KM){' '}
                <span className="text-accent">*</span>
              </Label>
              <Input
                ref={kmInitialRef}
                id="km-initial"
                name="km-initial"
                type="number"
                inputMode="decimal"
                min="0"
                max={LIMITS.kmMax}
                step="0.1"
                placeholder="Ex.: 84250"
                value={kmInitial}
                onChange={(event) => {
                  setKmInitial(event.target.value);
                  clearError('kmInitial');
                }}
                autoComplete="off"
                aria-required="true"
                aria-invalid={Boolean(errors.kmInitial)}
                aria-describedby={
                  errors.kmInitial ? 'km-initial-error' : 'km-initial-help'
                }
                className={cn(errors.kmInitial && 'border-destructive')}
              />
              <p id="km-initial-help" className="text-xs text-muted-foreground">
                KM do painel no início desta corrida.
              </p>
              {errors.kmInitial ? (
                <p id="km-initial-error" className="field-error">
                  {errors.kmInitial}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="km-final">
                Quilometragem final (KM){' '}
                <span className="font-normal text-muted-foreground">
                  (opcional)
                </span>
              </Label>
              <Input
                ref={kmFinalRef}
                id="km-final"
                name="km-final"
                type="number"
                inputMode="decimal"
                min="0"
                max={LIMITS.kmMax}
                step="0.1"
                placeholder="Ao encerrar a corrida"
                value={kmFinal}
                onChange={(event) => {
                  setKmFinal(event.target.value);
                  clearError('kmFinal');
                }}
                autoComplete="off"
                aria-invalid={Boolean(errors.kmFinal)}
                aria-describedby={
                  errors.kmFinal ? 'km-final-error' : 'km-final-help'
                }
                className={cn(errors.kmFinal && 'border-destructive')}
              />
              <p id="km-final-help" className="text-xs text-muted-foreground">
                Sem o KM final o app não calcula rendimento nem consumo.
              </p>
              {errors.kmFinal ? (
                <p id="km-final-error" className="field-error">
                  {errors.kmFinal}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="extra-expenses">
              Outras despesas (R$){' '}
              <span className="font-normal text-muted-foreground">
                (opcional)
              </span>
            </Label>
            <Input
              ref={extraExpensesRef}
              id="extra-expenses"
              name="extra-expenses"
              type="number"
              inputMode="decimal"
              min="0"
              max={LIMITS.extraExpensesMax}
              step="0.01"
              placeholder="Ex.: 12,00 de pedágio"
              value={extraExpenses}
              onChange={(event) => {
                setExtraExpenses(event.target.value);
                clearError('extraExpenses');
              }}
              autoComplete="off"
              aria-invalid={Boolean(errors.extraExpenses)}
              aria-describedby={
                errors.extraExpenses
                  ? 'extra-expenses-error'
                  : 'extra-expenses-help'
              }
              className={cn(errors.extraExpenses && 'border-destructive')}
            />
            <p id="extra-expenses-help" className="text-xs text-muted-foreground">
              Pedágio, lavagem, lanche e outros custos deste trajeto. Deixe em
              branco se não houver.
            </p>
            {errors.extraExpenses ? (
              <p id="extra-expenses-error" className="field-error">
                {errors.extraExpenses}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <Label htmlFor="notes">Observações</Label>
              <span
                className={cn(
                  'text-xs tabular-nums',
                  notes.length > LIMITS.notesMaxLength
                    ? 'text-destructive'
                    : 'text-muted-foreground',
                )}
              >
                {notes.length}/{LIMITS.notesMaxLength}
              </span>
            </div>
            <Textarea
              ref={notesRef}
              id="notes"
              name="notes"
              rows={3}
              maxLength={LIMITS.notesMaxLength}
              placeholder="Ex.: corrida para o aeroporto, passageiro generoso."
              value={notes}
              onChange={(event) => {
                setNotes(event.target.value);
                clearError('notes');
              }}
              aria-invalid={Boolean(errors.notes)}
              aria-describedby={errors.notes ? 'notes-error' : undefined}
              className={cn(errors.notes && 'border-destructive')}
            />
            {errors.notes ? (
              <p id="notes-error" className="field-error">
                {errors.notes}
              </p>
            ) : null}
          </div>

          {/* Resumo calculado ao vivo. */}
          <output
            htmlFor="fare fuel-quantity fuel-unit-price extra-expenses km-initial km-final"
            role="status"
            aria-live="polite"
            className={cn(
              'block rounded-2xl border-2 p-4 sm:p-5',
              profitIsLoss
                ? 'border-destructive/40 bg-red-50 dark:bg-red-950/30'
                : 'border-accent/30 bg-accent/5',
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Lucro líquido desta corrida
                </p>
                <p
                  className={cn(
                    'mt-1 flex items-center gap-2 text-3xl font-extrabold tabular-nums tracking-tight',
                    metrics.profit === null
                      ? 'text-muted-foreground'
                      : profitIsLoss
                        ? 'text-destructive'
                        : 'text-emerald-700 dark:text-emerald-300',
                  )}
                >
                  {profitIsLoss ? (
                    <TrendingDown className="size-7 shrink-0" aria-hidden="true" />
                  ) : (
                    <TrendingUp className="size-7 shrink-0" aria-hidden="true" />
                  )}
                  {metrics.profit === null ? 'R$ —' : formatBRL(metrics.profit)}
                </p>
              </div>
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-card text-primary shadow-sm dark:text-foreground">
                <Wallet className="size-5" aria-hidden="true" />
              </span>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t pt-3 text-xs sm:grid-cols-4">
              <div>
                <dt className="font-bold uppercase tracking-wide text-muted-foreground">
                  Despesas
                </dt>
                <dd className="mt-0.5 text-sm font-extrabold tabular-nums">
                  {formatBRL(metrics.totalExpenses)}
                </dd>
              </div>
              <div>
                <dt className="font-bold uppercase tracking-wide text-muted-foreground">
                  KM rodados
                </dt>
                <dd className="mt-0.5 text-sm font-extrabold tabular-nums">
                  {metrics.distance === null ? '—' : formatKm(metrics.distance)}
                </dd>
              </div>
              <div>
                <dt className="font-bold uppercase tracking-wide text-muted-foreground">
                  Rendimento
                </dt>
                <dd className="mt-0.5 text-sm font-extrabold tabular-nums">
                  {metrics.profitPerKm === null
                    ? '—'
                    : formatProfitPerKm(metrics.profitPerKm)}
                </dd>
              </div>
              <div>
                <dt className="font-bold uppercase tracking-wide text-muted-foreground">
                  Consumo
                </dt>
                <dd className="mt-0.5 text-sm font-extrabold tabular-nums">
                  {metrics.consumption === null || !fuelType
                    ? '—'
                    : formatConsumption(metrics.consumption, fuelType)}
                </dd>
              </div>
            </dl>

            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Lucro = valor da corrida − combustível − outras despesas.
              Rendimento = lucro ÷ KM rodado.
            </p>
          </output>

          <div className="space-y-3 border-t pt-5">
            <Button
              type="submit"
              variant="accent"
              size="lg"
              disabled={submitting}
              className="w-full"
            >
              {submitting ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : isEdit ? (
                <Check aria-hidden="true" />
              ) : (
                <Send aria-hidden="true" />
              )}
              {submitting
                ? 'Salvando...'
                : isEdit
                  ? 'Salvar alterações'
                  : 'Registrar corrida'}
            </Button>

            <p className="flex items-start justify-center gap-1.5 text-center text-xs text-muted-foreground">
              <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              {isEdit
                ? 'As alterações são salvas apenas na sua conta.'
                : 'A corrida fica salva apenas na sua conta, protegida por Row Level Security.'}
            </p>
          </div>
        </fieldset>
      </form>

      <Modal
        open={askQrOpen && Boolean(savedCharge)}
        onClose={handleDeclineQr}
        title="Gerar QR Code PIX?"
        description={`Corrida de ${
          savedCharge ? formatBRL(savedCharge.fare) : 'R$ —'
        } salva com sucesso. Quer gerar o QR Code para receber este valor?`}
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-secondary/40 p-4 text-sm">
            <p className="flex items-center gap-2 font-bold">
              <QrCode className="size-4 text-accent" aria-hidden="true" />
              Recebimento via PIX
            </p>
            <p className="mt-2 leading-relaxed text-muted-foreground">
              Chave {BRAND.pix.keyType} de <strong>{BRAND.owner}</strong>:{' '}
              <span className="font-mono">{formatPixKey()}</span>
            </p>
            {savedAlreadyPaid ? (
              <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs text-amber-950 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-100">
                Esta corrida já está marcada como paga. Ao gerar o QR Code, o
                status volta para <strong>aguardando pagamento</strong>.
              </p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Button
              variant="accent"
              size="lg"
              onClick={() => void handleGenerateQr()}
              disabled={generatingQr}
            >
              {generatingQr ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <QrCode aria-hidden="true" />
              )}
              {generatingQr ? 'Gerando...' : 'Gerar QR Code PIX'}
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={handleDeclineQr}
              disabled={generatingQr}
            >
              Agora não
            </Button>
          </div>
        </div>
      </Modal>

      <PixQrDialog
        charge={savedCharge}
        open={pixOpen}
        onClose={() => {
          setPixOpen(false);
          finish();
        }}
        onConfirmed={() => {
          setPixOpen(false);
          finish();
        }}
      />
    </>
  );
}

export function RideFormTips() {
  return (
    <aside className="space-y-4" aria-label="Dicas de uso">
      <div className="rounded-2xl border bg-card p-5 shadow-card">
        <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
          <Mic className="size-4 text-accent" aria-hidden="true" />
          Dite o valor da corrida
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Toque no microfone ao lado do valor e fale normalmente:{' '}
          <em>&ldquo;noventa e cinco reais&rdquo;</em>. O campo é preenchido
          automaticamente.
        </p>
      </div>

      <div className="rounded-2xl border border-sky-200 bg-sky-50 p-5 text-sky-950 dark:border-sky-800/60 dark:bg-sky-950/40 dark:text-sky-100">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Fuel className="size-4" aria-hidden="true" />
          Combustível calculado
        </h2>
        <p className="mt-2 text-sm leading-relaxed">
          Escolha <strong>GNV</strong>, <strong>Álcool</strong> ou{' '}
          <strong>Gasolina</strong>, informe a quantidade e o preço da bomba. O
          custo do abastecimento é calculado na hora.
        </p>
      </div>

      <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-950 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-100">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Gauge className="size-4" aria-hidden="true" />
          Quilometragem e rendimento
        </h2>
        <p className="mt-2 text-sm leading-relaxed">
          Com o <strong>KM inicial</strong> e o <strong>KM final</strong> o app
          mostra os KM rodados, o consumo (km/L ou km/m³) e o{' '}
          <strong>rendimento em R$/km</strong>.
        </p>
      </div>

      <div className="rounded-2xl border bg-card p-5 shadow-card">
        <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
          <Receipt className="size-4 text-accent" aria-hidden="true" />
          Despesas do trajeto
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Além do combustível, lance pedágio, lavagem ou qualquer extra. O lucro
          líquido desconta tudo.
        </p>
      </div>
    </aside>
  );
}
