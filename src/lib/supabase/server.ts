import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from './env';
import type { Database } from './types';

export const NOT_CONFIGURED_MESSAGE =
  'Supabase não configurado: preencha o .env.local com a URL e a anon key do seu projeto (veja o README).';

/**
 * Client do Supabase para Server Components e Route Handlers.
 * A sessão é lida dos cookies e atualizada pelo middleware.
 *
 * Retorna null quando as variáveis de ambiente não estão configuradas —
 * assim o app mostra o aviso de configuração em vez de quebrar (500).
 */
export function createClient() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const cookieStore = cookies();

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Components não podem gravar cookies; o middleware
          // já renovou a sessão antes da requisição chegar aqui.
        }
      },
    },
  });
}
