import { round } from '@/lib/calc';
import type { FuelRefuel, Ride } from '@/lib/supabase/types';

/**
 * Rateio do combustível entre corridas.
 *
 * O motorista abastece de tempos em tempos, não a cada corrida. Cada
 * abastecimento paga o combustível consumido no intervalo até o próximo
 * abastecimento.As corridas desse intervalo dividem o custo proporcionalmente
 * aos KM rodados (ou em partes iguais quando não há KM informado).
 *
 * A soma das parcelas de um abastecimento é SEMPRE igual ao seu custo total
 * (a sobra dos arredondamentos vai para a última corrida do intervalo).
 */
export interface FuelAllocation {
  cost: number;
  quantity: number;
}

export function rideDistanceKm(ride: Ride): number {
  if (typeof ride.distance_km === 'number' && ride.distance_km > 0) {
    return ride.distance_km;
  }

  if (
    typeof ride.km_final === 'number' &&
    typeof ride.km_initial === 'number' &&
    ride.km_final > ride.km_initial
  ) {
    return round(ride.km_final - ride.km_initial, 1);
  }

  return 0;
}

export function allocateFuel(
  refuels: FuelRefuel[],
  rides: Ride[],
): Map<string, FuelAllocation> {
  const result = new Map<string, FuelAllocation>();

  for (const ride of rides) {
    result.set(ride.id, { cost: 0, quantity: 0 });
  }

  const ordered = [...refuels]
    .filter((refuel) => Number.isFinite(new Date(refuel.fueled_at).getTime()))
    .sort(
      (a, b) =>
        new Date(a.fueled_at).getTime() - new Date(b.fueled_at).getTime(),
    );

  ordered.forEach((refuel, index) => {
    const start = new Date(refuel.fueled_at).getTime();
    const next = ordered[index + 1];
    const end = next ? new Date(next.fueled_at).getTime() : Infinity;

    const candidates = rides.filter((ride) => {
      const time = new Date(ride.ride_at).getTime();
      return Number.isFinite(time) && time >= start && time < end;
    });

    if (candidates.length === 0) return;

    // KM medido é o melhor critério; sem ele, todas as corridas pesam igual.
    const weights = candidates.map((ride) => {
      const distance = rideDistanceKm(ride);
      return distance > 0 ? distance : 1;
    });
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    if (totalWeight <= 0) return;

    let costUsed = 0;
    let quantityUsed = 0;

    candidates.forEach((ride, position) => {
      const current = result.get(ride.id) ?? { cost: 0, quantity: 0 };
      const isLast = position === candidates.length - 1;
      const share = weights[position] / totalWeight;

      const cost = isLast
        ? round(refuel.total_cost - costUsed, 2)
        : round(refuel.total_cost * share, 2);
      const quantity = isLast
        ? round(refuel.quantity - quantityUsed, 2)
        : round(refuel.quantity * share, 2);

      costUsed += cost;
      quantityUsed += quantity;

      result.set(ride.id, {
        cost: round(current.cost + cost, 2),
        quantity: round(current.quantity + quantity, 2),
      });
    });
  });

  return result;
}
