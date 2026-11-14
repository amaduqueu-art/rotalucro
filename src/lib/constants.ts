import type {
  FuelType,
  PaymentMethod,
  PaymentStatus,
} from '@/lib/supabase/types';

export interface FuelOption {
  value: FuelType;
  label: string;
  /** Unidade curta exibida nos cards (ex.: "m³"). */
  unitShort: string;
  /** Nome da unidade usado no rótulo do campo do formulário. */
  unitLabel: string;
  quantityLabel: string;
  /** Rótulo do preço por unidade (litro ou m³). */
  priceLabel: string;
  /** Preço médio inicial por unidade (R$). O motorista pode editar. */
  defaultUnitPrice: number;
  help: string;
}

export const FUEL_OPTIONS: readonly FuelOption[] = [
  {
    value: 'gnv',
    label: 'GNV',
    unitShort: 'm³',
    unitLabel: 'metros cúbicos (m³)',
    quantityLabel: 'Quantidade abastecida (m³)',
    priceLabel: 'Preço do m³ (R$)',
    defaultUnitPrice: 4.49,
    help: 'Informe os metros cúbicos registrados na bomba do posto.',
  },
  {
    value: 'alcool',
    label: 'Álcool',
    unitShort: 'L',
    unitLabel: 'litros (L)',
    quantityLabel: 'Quantidade abastecida (litros)',
    priceLabel: 'Preço do litro (R$)',
    defaultUnitPrice: 4.19,
    help: 'Informe os litros registrados na bomba do posto.',
  },
  {
    value: 'gasolina',
    label: 'Gasolina',
    unitShort: 'L',
    unitLabel: 'litros (L)',
    quantityLabel: 'Quantidade abastecida (litros)',
    priceLabel: 'Preço do litro (R$)',
    defaultUnitPrice: 6.09,
    help: 'Informe os litros registrados na bomba do posto.',
  },
];

export function getFuelOption(value: FuelType): FuelOption {
  return FUEL_OPTIONS.find((option) => option.value === value) ?? FUEL_OPTIONS[0];
}

export interface PaymentOption {
  value: PaymentMethod;
  label: string;
  description: string;
}

export const PAYMENT_OPTIONS: readonly PaymentOption[] = [
  {
    value: 'dinheiro',
    label: 'Dinheiro',
    description: 'Recebido em espécie',
  },
  {
    value: 'cartao',
    label: 'Cartão',
    description: 'Débito ou crédito',
  },
  {
    value: 'pix',
    label: 'PIX',
    description: 'QR Code ou chave',
  },
  {
    value: 'aplicativo',
    label: 'Aplicativo',
    description: '99, Uber e afins',
  },
];

export function getPaymentOption(value: PaymentMethod): PaymentOption {
  return (
    PAYMENT_OPTIONS.find((option) => option.value === value) ??
    PAYMENT_OPTIONS[0]
  );
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pendente: 'Aguardando pagamento',
  pago: 'Pagamento confirmado',
};

export const LIMITS = {
  notesMaxLength: 500,
  fareMax: 99999.99,
  fuelCostMax: 99999.99,
  fuelQuantityMax: 99999,
  fuelUnitPriceMax: 999.999,
  extraExpensesMax: 99999.99,
  kmMax: 9999999,
} as const;

export const PASSWORD_MIN_LENGTH = 6;
