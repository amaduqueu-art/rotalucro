import type { FuelType } from '@/lib/supabase/types';

export interface FuelOption {
  value: FuelType;
  label: string;
  /** Unidade curta exibida nos cards (ex.: "m³"). */
  unitShort: string;
  /** Nome da unidade usado no rótulo do campo do formulário. */
  unitLabel: string;
  quantityLabel: string;
  help: string;
}

export const FUEL_OPTIONS: readonly FuelOption[] = [
  {
    value: 'gnv',
    label: 'GNV',
    unitShort: 'm³',
    unitLabel: 'metros cúbicos (m³)',
    quantityLabel: 'Quantidade abastecida (m³)',
    help: 'Informe os metros cúbicos registrados na bomba do posto.',
  },
  {
    value: 'alcool',
    label: 'Álcool',
    unitShort: 'L',
    unitLabel: 'litros (L)',
    quantityLabel: 'Quantidade abastecida (litros)',
    help: 'Informe os litros registrados na bomba do posto.',
  },
];

export function getFuelOption(value: FuelType): FuelOption {
  return FUEL_OPTIONS.find((option) => option.value === value) ?? FUEL_OPTIONS[0];
}

export const LIMITS = {
  notesMaxLength: 500,
  fareMax: 99999.99,
  fuelCostMax: 99999.99,
  fuelQuantityMax: 99999,
  kmMax: 9999999,
} as const;

export const PASSWORD_MIN_LENGTH = 6;
