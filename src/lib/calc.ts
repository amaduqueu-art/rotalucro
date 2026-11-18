/** Utilitários de cálculo usados no formulário (o banco recalcula o lucro). */

export function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/** Converte o texto digitado em número (ou null quando vazio/inválido). */
export function parseDecimal(raw: string): number | null {
  const trimmed = raw.trim().replace(',', '.');
  if (trimmed === '') return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

export interface RideMetricsInput {
  fare: number | null;
  /** Parcela do abastecimento rateada para esta corrida. */
  fuelCost: number;
  /** Quantidade de combustível rateada (para calcular consumo). */
  fuelQuantity?: number;
  extraExpenses: number | null;
  kmInitial: number | null;
  kmFinal: number | null;
}

export interface RideMetrics {
  /** Parcela rateada do combustível. */
  fuelCost: number;
  /** Combustível rateado + outras despesas. */
  totalExpenses: number;
  /** Valor da corrida − despesas totais. */
  profit: number | null;
  /** KM final − KM inicial (null quando o KM final ainda não foi lançado). */
  distance: number | null;
  /** Lucro líquido por KM rodado. */
  profitPerKm: number | null;
  /** Consumo em km por litro (ou m³, no GNV). */
  consumption: number | null;
}

/**
 * Regra de negócio do app (a partir da versão 2.1):
 *   abastecimento é um evento a parte, rateado entre as corridas seguintes
 *   despesas totais = combustível rateado + extras
 *   lucro líquido  = valor da corrida − despesas totais
 *   rendimento     = lucro líquido ÷ KM rodado
 */
export function computeRideMetrics(input: RideMetricsInput): RideMetrics {
  const fuelCost = round(Math.max(input.fuelCost ?? 0, 0), 2);
  const extras = Math.max(input.extraExpenses ?? 0, 0);
  const totalExpenses = round(fuelCost + extras, 2);

  const profit =
    input.fare === null ? null : round(input.fare - totalExpenses, 2);

  const distance =
    input.kmFinal !== null &&
    input.kmInitial !== null &&
    input.kmFinal >= input.kmInitial
      ? round(input.kmFinal - input.kmInitial, 1)
      : null;

  const profitPerKm =
    profit !== null && distance !== null && distance > 0
      ? round(profit / distance, 2)
      : null;

  const quantity = Math.max(input.fuelQuantity ?? 0, 0);
  const consumption =
    distance !== null && distance > 0 && quantity > 0
      ? round(distance / quantity, 2)
      : null;

  return { fuelCost, totalExpenses, profit, distance, profitPerKm, consumption };
}
