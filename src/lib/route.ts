import type { RoutePoint } from '@/lib/supabase/types';

const EARTH_RADIUS_KM = 6371.0088;

/** O JSONB pode vir como array, objeto {points:[...]} ou string serializada. */
export function parseStoredRoute(value: unknown): RoutePoint[] {
  let raw = value;

  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      return [];
    }
  }

  if (Array.isArray(raw)) {
    return raw.filter(isRoutePoint);
  }

  if (raw && typeof raw === 'object' && 'points' in raw) {
    const points = (raw as { points: unknown }).points;
    return Array.isArray(points) ? points.filter(isRoutePoint) : [];
  }

  return [];
}

function isRoutePoint(value: unknown): value is RoutePoint {
  if (typeof value !== 'object' || value === null) return false;
  const point = value as Partial<RoutePoint>;
  return (
    typeof point.lat === 'number' &&
    Number.isFinite(point.lat) &&
    typeof point.lng === 'number' &&
    Number.isFinite(point.lng)
  );
}

/** Distância em linha reta entre dois pontos (fórmula de Haversine). */
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const deltaLat = lat2 - lat1;
  const deltaLng = toRadians(b.lng - a.lng);

  const h =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Soma dos segmentos capturados. Pontos com precisão muito baixa (GPS ruim)
 * são ignorados para não inflar a distância.
 */
export function routeDistanceKm(
  points: Array<{ lat: number; lng: number; accuracy?: number }>,
): number {
  let total = 0;

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];

    if (
      (previous.accuracy ?? 0) > 100 ||
      (current.accuracy ?? 0) > 100
    ) {
      continue;
    }

    const distance = haversineKm(previous, current);
    if (distance <= 0.5 || distance > 20) continue;

    total += distance;
  }

  return Math.round(total * 100) / 100;
}

/** Limita a quantidade de pontos salvos sem perder o formato da rota. */
export function limitRoutePoints<T>(points: T[], max = 500): T[] {
  if (points.length <= max) return points;

  const step = points.length / max;
  const result: T[] = [];

  for (let index = 0; index < max; index += 1) {
    result.push(points[Math.floor(index * step)]);
  }

  const last = points[points.length - 1];
  if (result[result.length - 1] !== last) result.push(last);

  return result;
}
