import { getFuelOption, getPaymentOption } from '@/lib/constants';
import type { FuelType, PaymentMethod } from '@/lib/supabase/types';

const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
});

const longDateFormatter = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});

const kmFormatter = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 1,
});

const quantityFormatter = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 2,
});

const unitPriceFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 3,
});

/** Formata um valor em Reais (BRL). */
export function formatBRL(value: number): string {
  return brlFormatter.format(Number.isFinite(value) ? value : 0);
}

/** "12 de nov. de 2026" */
export function formatDate(date: string | Date): string {
  return dateFormatter.format(toDate(date));
}

/** "14:30" */
export function formatTime(date: string | Date): string {
  return timeFormatter.format(toDate(date));
}

/** "12 de nov. de 2026 às 14:30" */
export function formatDateTime(date: string | Date): string {
  return `${formatDate(date)} às ${formatTime(date)}`;
}

/** "quinta-feira, 12 de novembro de 2026" */
export function formatLongDate(date: string | Date): string {
  return longDateFormatter.format(toDate(date));
}

/** Chave local (yyyy-mm-dd) usada para agrupar corridas por dia. */
export function dayKey(date: string | Date): string {
  const value = toDate(date);
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${value.getFullYear()}-${month}-${day}`;
}

export function todayKey(): string {
  return dayKey(new Date());
}

/** Rótulo do dia: "Hoje", "Ontem" ou data por extenso. */
export function dayLabel(key: string): string {
  const today = todayKey();
  const yesterday = dayKey(new Date(Date.now() - 24 * 60 * 60 * 1000));

  if (key === today) return 'Hoje';
  if (key === yesterday) return 'Ontem';
  return formatLongDate(new Date(`${key}T12:00:00`));
}

/** Converte um Date para o formato aceito por <input type="datetime-local">. */
export function toDatetimeLocalValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Interpreta o valor de um <input type="datetime-local"> como hora local. */
export function parseDatetimeLocal(value: string): Date {
  return new Date(value);
}

/** "12.340 km" */
export function formatKm(value: number): string {
  return `${kmFormatter.format(value)} km`;
}

/** "45,2 L" (álcool/gasolina) ou "12,5 m³" (GNV). */
export function formatFuelQuantity(
  quantity: number,
  fuelType: FuelType,
): string {
  const unit = fuelType === 'gnv' ? 'm³' : 'L';
  return `${quantityFormatter.format(quantity)} ${unit}`;
}

/** "R$ 6,09/L" ou "R$ 4,49/m³". */
export function formatUnitPrice(value: number, fuelType: FuelType): string {
  const unit = fuelType === 'gnv' ? 'm³' : 'L';
  return `${unitPriceFormatter.format(value)}/${unit}`;
}

/** "Gasolina" / "Álcool" / "GNV". */
export function formatFuelType(fuelType: FuelType): string {
  return getFuelOption(fuelType).label;
}

/** "Dinheiro" / "Cartão" / "PIX" / "Aplicativo". */
export function formatPaymentMethod(method: PaymentMethod): string {
  return getPaymentOption(method).label;
}

/** "12,5 km/L" ou "9,8 km/m³". */
export function formatConsumption(
  kmPerUnit: number,
  fuelType: FuelType,
): string {
  const unit = fuelType === 'gnv' ? 'm³' : 'L';
  return `${quantityFormatter.format(kmPerUnit)} km/${unit}`;
}

/** "R$ 2,45/km" */
export function formatProfitPerKm(value: number): string {
  return `${formatBRL(value)}/km`;
}

function toDate(date: string | Date): Date {
  return typeof date === 'string' ? new Date(date) : date;
}
