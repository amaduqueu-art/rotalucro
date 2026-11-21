'use client';

import { useCallback, useEffect, useState } from 'react';

import { createClient } from '@/lib/supabase/client';
import type { DriverProfile, DriverProfileInput } from '@/lib/supabase/types';
import { getErrorMessage } from '@/lib/utils';

interface UseDriverProfileOptions {
  /** Permite desativar a busca automática (telas que só precisam do `save`). */
  enabled?: boolean;
}

interface UseDriverProfileResult {
  profile: DriverProfile | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  /** Tabela `driver_profiles` ainda não criada (migração 2.2 não rodou). */
  unavailable: boolean;
  reload: () => Promise<void>;
  save: (input: DriverProfileInput) => Promise<boolean>;
}

function isMissingTableError(error: unknown): boolean {
  return /driver_profiles|schema cache/i.test(getErrorMessage(error, ''));
}

/**
 * Carrega e salva a chave PIX do motorista logado.
 *
 * O RLS do Supabase limita a linha a `auth.uid() = user_id`, então cada
 * taxista vê e edita somente o próprio perfil — o mesmo modelo das corridas.
 */
export function useDriverProfile(
  { enabled = true }: UseDriverProfileOptions = {},
): UseDriverProfileResult {
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  const reload = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);

    try {
      const { data, error: fetchError } = await createClient()
        .from('driver_profiles')
        .select('*')
        .maybeSingle();

      if (fetchError) throw fetchError;

      setProfile((data as DriverProfile | null) ?? null);
      setError(null);
      setUnavailable(false);
    } catch (fetchError) {
      setProfile(null);

      if (isMissingTableError(fetchError)) {
        setUnavailable(true);
        setError(
          'Perfil PIX indisponível: execute a migração 2.2 no Supabase (veja o README).',
        );
      } else {
        setUnavailable(false);
        setError(
          getErrorMessage(fetchError, 'Não foi possível carregar sua chave PIX.'),
        );
      }
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const save = useCallback(
    async (input: DriverProfileInput): Promise<boolean> => {
      setSaving(true);
      setError(null);

      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          throw new Error('Sua sessão expirou. Entre novamente para salvar.');
        }

        const { data, error: upsertError } = await supabase
          .from('driver_profiles')
          .upsert({ ...input, user_id: user.id }, { onConflict: 'user_id' })
          .select('*')
          .single();

        if (upsertError) throw upsertError;

        setProfile(data as DriverProfile);
        setUnavailable(false);
        return true;
      } catch (saveError) {
        setError(
          isMissingTableError(saveError)
            ? 'Execute a migração 2.2 no Supabase para salvar sua chave PIX.'
            : getErrorMessage(saveError, 'Não foi possível salvar sua chave PIX.'),
        );
        return false;
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  return { profile, loading, saving, error, unavailable, reload, save };
}
