'use client';

import { Check, Fuel, Loader2 } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { computeRideMetrics, parseDecimal, round } from '@/lib/calc';
import { FUEL_OPTIONS, LIMITS } from '@/lib/constants';
import {
  formatBRL,
  formatUnitPrice,
  parseDatetimeLocal,
  toDatetimeLocalValue,
} from '@/lib/format';
import type { FuelType, FuelRefuelInsert } from '@/lib/supabase/types';
import { getErrorMessage } from '@/lib/utils';

type FieldName =
  | 'fueledAt'
  | 'fuelType'
  | 'quantity'
  | 'unitPrice'
  | 'odometer'
  | 'station'
  | 'notes';

interface RefuelDialogProps {
  open: boolean;
  onClose: () => void;
  /** Data/hora sugerida (por exemplo, a da corrida que está sendo registrada). */
  defaultDate?: Date;
  onSave: (input: Omit<FuelRefuelInsert, 'user_id'>) => Promise<unknown>;
  onSaved?: () => void;
}

/**
 * Cadastro de abastecimento. Fica FORA da corrida: o motorista sinaliza que
 * precisa abastecer e informa quantidade/preço apenas neste momento.
 */
export function RefuelDialog({
  open,
  onClose,
  defaultDate,
  onSave,
  onSaved,
}: RefuelDialogProps) {
  const [fueledAt, setFueledAt] = useState(() =>
    toDatetimeLocalValue(defaultDate ?? new Date()),
  );
  const [fuelType, setFuelType] = useState<FuelType>('gasolina');
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState(
    FUEL_OPTIONS.find((option) => option.value === 'gasolina')?.defaultUnitPrice.toFixed(3) ?? '',
  );
  const [odometer, setOdometer] = useState('');
  const [station, setStation] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFueledAt(toDatetimeLocalValue(defaultDate ?? new Date()));
    setErrors({});
  }, [open, defaultDate]);

  const selectedFuel = FUEL_OPTIONS.find((option) => option.value === fuelType);
  const quantityValue = parseDecimal(quantity);
  const priceValue = parseDecimal(unitPrice);
  const total =
    quantityValue !== null && priceValue !== null
      ? round(quantityValue * priceValue, 2)
      : 0;

  function changeFuelType(next: FuelType) {
    const previousDefault =
      FUEL_OPTIONS.find((option) => option.value === fuelType)?.defaultUnitPrice;
    const untouched =
      unitPrice.trim() === '' ||
      (previousDefault !== undefined && priceValue === previousDefault);

    setFuelType(next);
    if (untouched) {
      setUnitPrice(
        FUEL_OPTIONS.find((option) => option.value === next)?.defaultUnitPrice.toFixed(3) ?? '',
      );
    }
  }

  function validate(): boolean {
    const next: Partial<Record<FieldName, string>> = {};

    if (!fueledAt || Number.isNaN(parseDatetimeLocal(fueledAt).getTime())) {
      next.fueledAt = 'Informe a data e a hora do abastecimento.';
    }

    if (quantityValue === null || quantityValue <= 0) {
      next.quantity = 'Informe a quantidade abastecida.';
    } else if (quantityValue > LIMITS.fuelQuantityMax) {
      next.quantity = 'A quantidade parece alta demais. Confira.';
    }

    if (priceValue === null || priceValue < 0) {
      next.unitPrice = 'Informe o preço pago.';
    } else if (priceValue > LIMITS.fuelUnitPriceMax) {
      next.unitPrice = 'O preço parece alto demais. Confira.';
    }

    if (total > LIMITS.fuelCostMax) {
      next.quantity = 'O valor total parece alto demais. Confira.';
    }

    const odometerValue = parseDecimal(odometer);
    if (odometerValue !== null && (odometerValue < 0 || odometerValue > LIMITS.kmMax)) {
      next.odometer = 'Informe uma quilometragem válida.';
    }

    if (notes.length > LIMITS.notesMaxLength) {
      next.notes = `Use no máximo ${LIMITS.notesMaxLength} caracteres.`;
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || !validate()) return;

    setSaving(true);

    try {
      await onSave({
        fueled_at: parseDatetimeLocal(fueledAt).toISOString(),
        fuel_type: fuelType,
        quantity: round(quantityValue ?? 0, 2),
        unit_price: round(priceValue ?? 0, 3),
        total_cost: total,
        odometer: parseDecimal(odometer),
        station: station.trim() || null,
        notes: notes.trim() || null,
      });

      toast.success('Abastecimento registrado!', {
        description: `${formatBRL(total)} serão rateados entre as próximas corridas.`,
      });
      setQuantity('');
      setOdometer('');
      setStation('');
      setNotes('');
      onSaved?.();
      onClose();
    } catch (error) {
      toast.error('Não foi possível salvar o abastecimento', {
        description: getErrorMessage(error, 'Tente novamente em instantes.'),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Registrar abastecimento"
      description="Você abastece de tempos em tempos. O custo será dividido entre as corridas seguintes."
      className="sm:max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="refuel-at">Data e hora</Label>
          <Input
            id="refuel-at"
            type="datetime-local"
            value={fueledAt}
            onChange={(event) => setFueledAt(event.target.value)}
            aria-invalid={Boolean(errors.fueledAt)}
          />
          {errors.fueledAt ? <p className="field-error">{errors.fueledAt}</p> : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="refuel-type">Combustível</Label>
            <Select
              id="refuel-type"
              value={fuelType}
              onChange={(event) => changeFuelType(event.target.value as FuelType)}
            >
              {FUEL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="refuel-odometer">KM do painel (opcional)</Label>
            <Input
              id="refuel-odometer"
              type="number"
              inputMode="decimal"
              min="0"
              max={LIMITS.kmMax}
              step="0.1"
              placeholder="Ex.: 84250"
              value={odometer}
              onChange={(event) => setOdometer(event.target.value)}
              aria-invalid={Boolean(errors.odometer)}
            />
            {errors.odometer ? <p className="field-error">{errors.odometer}</p> : null}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="refuel-quantity">{selectedFuel?.quantityLabel ?? 'Quantidade'}</Label>
            <Input
              id="refuel-quantity"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="Ex.: 35,5"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              aria-invalid={Boolean(errors.quantity)}
            />
            {errors.quantity ? <p className="field-error">{errors.quantity}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="refuel-price">{selectedFuel?.priceLabel ?? 'Preço unitário'}</Label>
            <Input
              id="refuel-price"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.001"
              placeholder="Ex.: 6,09"
              value={unitPrice}
              onChange={(event) => setUnitPrice(event.target.value)}
              aria-invalid={Boolean(errors.unitPrice)}
            />
            {errors.unitPrice ? <p className="field-error">{errors.unitPrice}</p> : null}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-accent/30 bg-accent/5 p-3">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <Fuel className="size-4 text-accent" aria-hidden="true" />
            Total do abastecimento
          </span>
          <span className="text-xl font-extrabold tabular-nums">{formatBRL(total)}</span>
        </div>

        <div className="space-y-2">
          <Label htmlFor="refuel-station">Posto (opcional)</Label>
          <Input
            id="refuel-station"
            value={station}
            maxLength={80}
            placeholder="Ex.: Posto BR 101"
            onChange={(event) => setStation(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="refuel-notes">Observações (opcional)</Label>
          <Textarea
            id="refuel-notes"
            rows={2}
            value={notes}
            maxLength={LIMITS.notesMaxLength}
            placeholder="Ex.: tanque cheio, nota fiscal guardada"
            onChange={(event) => setNotes(event.target.value)}
            aria-invalid={Boolean(errors.notes)}
          />
          {errors.notes ? <p className="field-error">{errors.notes}</p> : null}
        </div>

        <p className="text-xs leading-relaxed text-muted-foreground">
          Preço médio sugerido para {selectedFuel?.label.toLowerCase()}:{' '}
          {selectedFuel
            ? formatUnitPrice(selectedFuel.defaultUnitPrice, selectedFuel.value)
            : '—'}
          . Ajuste para o valor da bomba.
        </p>

        <Button type="submit" variant="accent" size="lg" className="w-full" disabled={saving}>
          {saving ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <Check aria-hidden="true" />
          )}
          {saving ? 'Salvando...' : 'Salvar abastecimento'}
        </Button>
      </form>
    </Modal>
  );
}
