'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { haversineKm, limitRoutePoints, routeDistanceKm } from '@/lib/route';
import type { RoutePoint } from '@/lib/supabase/types';

const MAX_POINTS = 500;
const MIN_MOVEMENT_METERS = 4;

/**
 * Rastreamento da rota da corrida com a geolocalização nativa do navegador.
 * Nada é enviado a serviço de terceiros: os pontos ficam no Supabase da sua
 * conta e são exibidos no mini-mapa do formulário.
 */
export function useRouteTracker(
  initialPoints: RoutePoint[] = [],
  initialStartedAt: string | null = null,
  initialEndedAt: string | null = null,
) {
  const [points, setPoints] = useState<RoutePoint[]>(initialPoints);
  const [tracking, setTracking] = useState(false);
  const [manual, setManual] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(initialStartedAt);
  const [endedAt, setEndedAt] = useState<string | null>(initialEndedAt);

  const watchId = useRef<number | null>(null);
  const lastPoint = useRef<RoutePoint | null>(null);

  const stop = useCallback(() => {
    if (watchId.current !== null && typeof navigator !== 'undefined') {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setTracking(false);
    setEndedAt((previous) => previous ?? new Date().toISOString());
  }, []);

  const start = useCallback(() => {
    setError(null);

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setManual(true);
      setTracking(true);
      setStartedAt((previous) => previous ?? new Date().toISOString());
      setEndedAt(null);
      setError(
        'GPS indisponível neste navegador. Toque no mapa para marcar os pontos da rota.',
      );
      return;
    }

    if (watchId.current !== null) return;

    setManual(false);
    setStartedAt(new Date().toISOString());
    setEndedAt(null);
    setTracking(true);

    try {
      watchId.current = navigator.geolocation.watchPosition(
        (position) => {
          const point: RoutePoint = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            at: new Date(position.timestamp).toISOString(),
            accuracy: position.coords.accuracy,
          };

          const last = lastPoint.current;
          if (
            last &&
            haversineKm(last, point) * 1000 < MIN_MOVEMENT_METERS
          ) {
            return;
          }

          lastPoint.current = point;
          setPoints((previous) => limitRoutePoints([...previous, point], MAX_POINTS));
        },
        (positionError) => {
          if (positionError.code === positionError.PERMISSION_DENIED) {
            setError('Permita o uso da localização para desenhar a rota.');
          } else if (positionError.code === positionError.TIMEOUT) {
            setError('Não consegui localizar o aparelho. Tente novamente.');
          } else {
            setError('Não foi possível capturar o GPS neste dispositivo.');
          }
        },
        {
          enableHighAccuracy: true,
          maximumAge: 2000,
          timeout: 12000,
        },
      );
    } catch {
      setManual(true);
      setError('Não foi possível iniciar o GPS. Toque no mapa para marcar pontos.');
    }
  }, []);

  const addPoint = useCallback((lat: number, lng: number) => {
    const point: RoutePoint = { lat, lng, at: new Date().toISOString() };
    lastPoint.current = point;
    setPoints((previous) => limitRoutePoints([...previous, point], MAX_POINTS));
  }, []);

  const clear = useCallback(() => {
    stop();
    setPoints([]);
    setStartedAt(null);
    setEndedAt(null);
    lastPoint.current = null;
    setError(null);
  }, [stop]);

  const distanceKm = useMemo(() => routeDistanceKm(points), [points]);

  useEffect(
    () => () => {
      if (watchId.current !== null && typeof navigator !== 'undefined') {
        navigator.geolocation.clearWatch(watchId.current);
      }
    },
    [],
  );

  return {
    points,
    setPoints,
    tracking,
    manual,
    error,
    startedAt,
    endedAt,
    distanceKm,
    start,
    stop,
    clear,
    addPoint,
  };
}
