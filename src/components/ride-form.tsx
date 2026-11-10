'use client';

import {
  AlertTriangle,
  Check,
  Loader2,
  Lock,
  Send,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FUEL_OPTIONS, LIMITS, getFuelOption } from '@/lib/constants';
import {
  formatBRL,
  formatKm,
  toDatetimeLocalValue,
  parseDatetimeLocal,
} from '@/lib/format';
import { createClient } from '@/lib/supabase/client';
import type { FuelType, Ride } from '@/lib/supabase/types';
import { cn, getErrorMessage } from '@/lib/utils';

type FieldName =
  | 'rideAt'
  | 'fare'
  | 'fuelType'
  | 'fuelQuantity'
  | 'kmInitial'
  | 'kmFinal'
  | 'fuelCost'
  | 'notes';

type FieldErrors = Partial<Record<FieldName, string>>;

/** Converte o texto digitado em número (ou null quando vazio/inválido). */
function parseDecimal(raw: string): number | null {
  const trimmed = raw.trim().replace(',', '.');
  if (trimmed === '') return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

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
  const [fuelType, setFuelType] = useState<FuelType | ''>(ride?.fuel_type ?? '');
  const [fuelQuantity, setFuelQuantity] = useState(
    ride ? String(ride.fuel_quantity) : '',
  );
  const [kmInitial, setKmInitial] = useState(
    ride ? String(ride.km_initial) : '',
  );
  const [kmFinal, setKmFinal] = useState(
    ride?.km_final !== null && ride?.km_final !== undefined
      ? String(ride.km_final)
      : '',
  );
  const [fuelCost, setFuelCost] = useState(ride ? String(ride.fuel_cost) : '');
  const [notes, setNotes] = useState(ride?.notes ?? '');

  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const rideAtRef = useRef<HTMLInputElement>(null);
  const fareRef = useRef<HTMLInputElement>(null);
  const fuelTypeRef = useRef<HTMLDivElement>(null);
  const fuelQuantityRef = useRef<HTMLInputElement>(null);
  const kmInitialRef = useRef<HTMLInputElement>(null);
  const kmFinalRef = useRef<HTMLInputElement>(null);
  const fuelCostRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  const selectedFuel = fuelType ? getFuelOption(fuelType) : null;

  // Lucro calculado ao vivo: valor recebido − gasto com combustível.
  const live = useMemo(() => {
    const fareValue = parseDecimal(fare);
    const fuelCostValue = parseDecimal(fuelCost);
    const kmInitialValue = parseDecimal(kmInitial);
    const kmFinalValue = parseDecimal(kmFinal);

    const profit =
      fareValue !== null && fuelCostValue !== null
        ? round(fareValue - fuelCostValue, 2)
        : null;

    const distance =
      kmFinalValue !== null && kmInitialValue !== null
        ? round(kmFinalValue - kmInitialValue, 1)
        : null;

    return { profit, distance };
  }, [fare, fuelCost, kmInitial, kmFinal]);

  function clearError(field: FieldName) {
    setErrors((previous) => {
      if (!previous[field]) return previous;
      const next = { ...previous };
      delete next[field];
      return next;
    });
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

    const kmInitialValue = parseDecimal(kmInitial);
    if (kmInitialValue === null) {
      nextErrors.kmInitial = 'Informe a quilometragem inicial.';
    } else if (kmInitialValue < 0) {
      nextErrors.kmInitial = 'A quilometragem não pode ser negativa.';
    } else if (kmInitialValue > LIMITS.kmMax) {
      nextErrors.kmInitial = 'A quilometragem parece alta demais. Confira.';
    }

    const kmFinalValue = parseDecimal(kmFinal);
    if (kmFinalValue !== null && kmInitialValue !== null) {
      if (kmFinalValue < kmInitialValue) {
        nextErrors.kmFinal =
          'O KM final deve ser igual ou maior que o KM inicial.';
      } else if (kmFinalValue > LIMITS.kmMax) {
        nextErrors.kmFinal = 'A quilometragem parece alta demais. Confira.';
      }
    }

    const fuelCostValue = parseDecimal(fuelCost);
    if (fuelCostValue === null) {
      nextErrors.fuelCost = 'Informe o valor total gasto no abastecimento.';
    } else if (fuelCostValue < 0) {
      nextErrors.fuelCost = 'O gasto não pode ser negativo.';
    } else if (fuelCostValue > LIMITS.fuelCostMax) {
      nextErrors.fuelCost = 'O gasto parece alto demais. Confira.';
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
          ['kmInitial', kmInitialRef],
          ['kmFinal', kmFinalRef],
          ['fuelCost', fuelCostRef],
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

      const payload = {
        user_id: user.id,
        ride_at: parseDatetimeLocal(rideAt).toISOString(),
        fare: round(parseDecimal(fare) ?? 0, 2),
        fuel_type: fuelType as FuelType,
        fuel_quantity: round(parseDecimal(fuelQuantity) ?? 0, 2),
        fuel_cost: round(parseDecimal(fuelCost) ?? 0, 2),
        km_initial: round(parseDecimal(kmInitial) ?? 0, 1),
        km_final:
          parseDecimal(kmFinal) !== null
            ? round(parseDecimal(kmFinal) ?? 0, 1)
            : null,
        notes: notes.trim() || null,
      };

      if (ride) {
        const { error: updateError } = await supabase
          .from('rides')
          .update(payload)
          .eq('id', ride.id);

        if (updateError) throw updateError;

        toast.success('Corrida atualizada!');
      } else {
        const { error: insertError } = await supabase
          .from('rides')
          .insert(payload);

        if (insertError) throw insertError;

        toast.success('Corrida registrada!', {
          description:
            live.profit !== null
              ? `Lucro de ${formatBRL(live.profit)} calculado automaticamente.`
              : 'Confira o lucro no histórico.',
        });
      }

      router.push('/historico');
      router.refresh();
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

  const profitIsLoss = (live.profit ?? 0) < 0;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {formError ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-red-50 p-4 text-sm text-red-950"
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
            Valor recebido pela corrida (R$){' '}
            <span className="text-accent">*</span>
          </Label>
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
            }}
            autoComplete="off"
            aria-required="true"
            aria-invalid={Boolean(errors.fare)}
            aria-describedby={errors.fare ? 'fare-error' : 'fare-help'}
            className={cn(errors.fare && 'border-destructive')}
          />
          <p id="fare-help" className="text-xs text-muted-foreground">
            Quanto o passageiro pagou, sem descontar o combustível.
          </p>
          {errors.fare ? (
            <p id="fare-error" className="field-error">
              {errors.fare}
            </p>
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
            onChange={(event) => {
              setFuelType(event.target.value as FuelType | '');
              clearError('fuelType');
            }}
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
            O tipo define a unidade da quantidade abastecida.
          </p>
          {errors.fuelType ? (
            <p id="fuel-type-error" className="field-error">
              {errors.fuelType}
            </p>
          ) : null}
        </div>

        {selectedFuel ? (
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
            <p id="fuel-quantity-help" className="text-xs text-muted-foreground">
              {selectedFuel.help}
            </p>
            {errors.fuelQuantity ? (
              <p id="fuel-quantity-error" className="field-error">
                {errors.fuelQuantity}
              </p>
            ) : null}
          </div>
        ) : null}

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
            Anote o KM do painel logo após abastecer.
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
            placeholder="Preencha no próximo abastecimento"
            value={kmFinal}
            onChange={(event) => {
              setKmFinal(event.target.value);
              clearError('kmFinal');
            }}
            autoComplete="off"
            aria-invalid={Boolean(errors.kmFinal)}
            aria-describedby={errors.kmFinal ? 'km-final-error' : 'km-final-help'}
            className={cn(errors.kmFinal && 'border-destructive')}
          />
          <p id="km-final-help" className="text-xs text-muted-foreground">
            Você lança o valor no momento do próximo abastecimento — dá para
            editar depois.
          </p>
          {errors.kmFinal ? (
            <p id="km-final-error" className="field-error">
              {errors.kmFinal}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="fuel-cost">
            Valor total gasto com combustível (R$){' '}
            <span className="text-accent">*</span>
          </Label>
          <Input
            ref={fuelCostRef}
            id="fuel-cost"
            name="fuel-cost"
            type="number"
            inputMode="decimal"
            min="0"
            max={LIMITS.fuelCostMax}
            step="0.01"
            placeholder="Ex.: 42,00"
            value={fuelCost}
            onChange={(event) => {
              setFuelCost(event.target.value);
              clearError('fuelCost');
            }}
            autoComplete="off"
            aria-required="true"
            aria-invalid={Boolean(errors.fuelCost)}
            aria-describedby={errors.fuelCost ? 'fuel-cost-error' : 'fuel-cost-help'}
            className={cn(errors.fuelCost && 'border-destructive')}
          />
          <p id="fuel-cost-help" className="text-xs text-muted-foreground">
            Quanto saiu do bolso no abastecimento desta corrida.
          </p>
          {errors.fuelCost ? (
            <p id="fuel-cost-error" className="field-error">
              {errors.fuelCost}
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

        {/* Lucro calculado automaticamente, atualizado a cada digitação. */}
        <output
          htmlFor="fare fuel-cost"
          role="status"
          aria-live="polite"
          className={cn(
            'block rounded-2xl border-2 p-4 sm:p-5',
            profitIsLoss
              ? 'border-destructive/40 bg-red-50'
              : 'border-accent/30 bg-accent/5',
          )}
        >
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Lucro desta corrida
          </p>
          <p
            className={cn(
              'mt-1 flex items-center gap-2 text-3xl font-extrabold tracking-tight tabular-nums',
              live.profit === null
                ? 'text-muted-foreground'
                : profitIsLoss
                  ? 'text-destructive'
                  : 'text-emerald-700',
            )}
          >
            {profitIsLoss ? (
              <TrendingDown className="size-7 shrink-0" aria-hidden="true" />
            ) : (
              <TrendingUp className="size-7 shrink-0" aria-hidden="true" />
            )}
            {live.profit === null ? 'R$ —' : formatBRL(live.profit)}
          </p>
          {live.distance !== null && live.distance > 0 ? (
            <p className="mt-1 text-xs font-medium text-muted-foreground">
              {formatKm(live.distance)} rodados
              {live.profit !== null && live.distance > 0
                ? ` · ${formatBRL(live.profit / live.distance)} por km`
                : null}
            </p>
          ) : null}
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            Calculado automaticamente: valor recebido − gasto com combustível.
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
  );
}

export function RideFormTips() {
  return (
    <aside className="space-y-4" aria-label="Dicas de uso">
      <div className="rounded-2xl border bg-card p-5 shadow-card">
        <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
          <TrendingUp className="size-4 text-accent" aria-hidden="true" />
          Como o lucro é calculado
        </h2>
        <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-muted-foreground">
          <li>
            • Lucro = valor recebido na corrida − valor gasto no abastecimento.
          </li>
          <li>• O cálculo aparece em tempo real enquanto você digita.</li>
          <li>• O histórico agrupa tudo por dia e mostra o lucro em destaque.</li>
        </ul>
      </div>

      <div className="rounded-2xl border border-sky-200 bg-sky-50 p-5 text-sky-950">
        <h2 className="text-sm font-bold">Quilometragem do posto</h2>
        <p className="mt-2 text-sm leading-relaxed">
          Anote o <strong>KM inicial</strong> logo após abastecer. O{' '}
          <strong>KM final</strong> é lançado no momento do{' '}
          <strong>próximo abastecimento</strong> — edite a corrida no histórico
          quando isso acontecer.
        </p>
      </div>

      <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-950">
        <h2 className="text-sm font-bold">GNV ou Álcool</h2>
        <p className="mt-2 text-sm leading-relaxed">
          Escolha <strong>GNV</strong> para lançar metros cúbicos (m³) ou{' '}
          <strong>Álcool</strong> para lançar litros (L). A unidade muda junto
          com o tipo.
        </p>
      </div>
    </aside>
  );
}
