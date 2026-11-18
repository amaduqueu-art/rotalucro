'use client';

import { useCallback, useEffect, useState } from 'react';

import { allocateFuel } from '@/lib/fuel-allocation';
import { createClient } from '@/lib/supabase/client';
import type { FuelRefuel, FuelRefuelInsert, Ride } from '@/lib/supabase/types';
import { getErrorMessage } from '@/lib/utils';

interface UseRidesOptions {
  /**
   * Quando false, não busca nada até ser reativado. O assistente usa isso
   * para carregar as corridas somente quando o painel é aberto.
   */
  enabled?: boolean;
}

interface UseRidesResult {
  rides: Ride[] | null;
  refuels: FuelRefuel[];
  error: string | null;
  refuelsError: string | null;
  refreshing: boolean;
  loading: boolean;
  reload: () => Promise<void>;
  removeRide: (id: string) => Promise<void>;
  addRefuel: (input: Omit<FuelRefuelInsert, 'user_id'>) => Promise<boolean>;
  removeRefuel: (id: string) => Promise<boolean>;
}

/**
 * Carrega as corridas do motorista logado (RLS filtra no banco) junto com os
 * abastecimentos e recalcula a parcela de combustível de cada corrida.
 *
 * `rides === null` enquanto carrega — use para exibir skeletons.
 */
export function useRides({ enabled = true }: UseRidesOptions = {}): UseRidesResult {
  const [rides, setRides] = useState<Ride[] | null>(null);
  const [refuels, setRefuels] = useState<FuelRefuel[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refuelsError, setRefuelsError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);

    const supabase = createClient();

    try {
      const { data, error: fetchError } = await supabase
        .from('rides')
        .select('*')
        .order('ride_at', { ascending: false })
        .limit(500);

      if (fetchError) throw fetchError;

      const loaded = (data ?? []) as Ride[];

      // Abastecimentos moram em tabela própria. Se a migration 2.1 ainda não
      // rodou, seguimos com os dados antigos em vez de quebrar o app.
      const refuelResult = await supabase
        .from('fuel_refuels')
        .select('*')
        .order('fueled_at', { ascending: false })
        .limit(500);

      let currentRefuels: FuelRefuel[] = [];
      let refuelsAvailable = false;

      if (refuelResult.error) {
        setRefuelsError(
          'Abastecimentos indisponíveis: execute a migração 2.1 no Supabase.',
        );
      } else {
        refuelsAvailable = true;
        currentRefuels = (refuelResult.data ?? []) as FuelRefuel[];
        setRefuelsError(null);
        setRefuels(currentRefuels);
      }

      // Sem a tabela de abastecimentos não recalculamos nada: zerar o
      // fuel_cost antigo apagaria dados de quem ainda está na versão 2.0.
      if (!refuelsAvailable) {
        setRides(loaded);
        setError(null);
        return;
      }

      const allocations = allocateFuel(currentRefuels, loaded);
      const changed: Ride[] = [];

      const adjusted = loaded.map((ride) => {
        const allocation = allocations.get(ride.id) ?? { cost: 0, quantity: 0 };
        const cost = roundMoney(allocation.cost);

        if (Math.abs(ride.fuel_cost - cost) >= 0.005) {
          changed.push({ ...ride, fuel_cost: cost });
        }

        return {
          ...ride,
          fuel_cost: cost,
          profit: roundMoney(ride.fare - cost - ride.extra_expenses),
        };
      });

      // Persiste o rateio para que dashboard/histórico/assistente
      // continuem lendo colunas geradas pelo banco sem duplicar trabalho.
      if (changed.length > 0) {
        await Promise.allSettled(
          changed.map((ride) =>
            supabase.from('rides').update({ fuel_cost: ride.fuel_cost }).eq('id', ride.id),
          ),
        );
      }

      setRides(adjusted);
      setError(null);
    } catch (cause) {
      setError(getErrorMessage(cause, 'Não foi possível carregar suas corridas.'));
    } finally {
      setRefreshing(false);
      setLoadedOnce(true);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void load();
  }, [enabled, load]);

  const removeRide = useCallback(async (id: string) => {
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from('rides')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    setRides((previous) =>
      previous ? previous.filter((ride) => ride.id !== id) : previous,
    );
    await load();
  }, [load]);

  const addRefuel = useCallback(
    async (input: Omit<FuelRefuelInsert, 'user_id'>) => {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Sua sessão expirou. Entre novamente para abastecer.');
      }

      const { error: insertError } = await supabase
        .from('fuel_refuels')
        .insert({ ...input, user_id: user.id });

      if (insertError) throw insertError;

      await load();
      return true;
    },
    [load],
  );

  const removeRefuel = useCallback(
    async (id: string) => {
      const supabase = createClient();
      const { error: deleteError } = await supabase
        .from('fuel_refuels')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      await load();
      return true;
    },
    [load],
  );

  return {
    rides,
    refuels,
    error,
    refuelsError,
    refreshing,
    loading: !loadedOnce && refreshing,
    reload: load,
    removeRide,
    addRefuel,
    removeRefuel,
  };
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
