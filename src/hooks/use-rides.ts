'use client';

import { useCallback, useEffect, useState } from 'react';

import type { Ride } from '@/lib/supabase/types';
import { createClient } from '@/lib/supabase/client';
import { getErrorMessage } from '@/lib/utils';

interface UseRidesOptions {
  /**
   * Quando false, não busca nada até ser reativado. O assistente usa isso
   * para carregar as corridas somente quando o painel é aberto.
   */
  enabled?: boolean;
}

/**
 * Carrega as corridas do motorista logado (RLS filtra no banco).
 * `rides === null` enquanto carrega — use para exibir skeletons.
 */
export function useRides({ enabled = true }: UseRidesOptions = {}) {
  const [rides, setRides] = useState<Ride[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);

    try {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from('rides')
        .select('*')
        .order('ride_at', { ascending: false })
        .limit(500);

      if (fetchError) throw fetchError;

      setRides(data ?? []);
      setError(null);
    } catch (cause) {
      setError(
        getErrorMessage(cause, 'Não foi possível carregar suas corridas.'),
      );
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void load();
  }, [enabled, load]);

  const removeRide = useCallback((id: string) => {
    setRides((previous) =>
      previous ? previous.filter((ride) => ride.id !== id) : previous,
    );
  }, []);

  return {
    rides,
    error,
    refreshing,
    loading: rides === null && error === null,
    reload: load,
    removeRide,
  };
}
