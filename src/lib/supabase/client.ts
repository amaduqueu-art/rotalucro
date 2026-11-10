'use client';

import { createBrowserClient } from '@supabase/ssr';

import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from './env';
import type { Database } from './types';

export const NOT_CONFIGURED_MESSAGE =
  'Supabase não configurado: preencha o .env.local com a URL e a anon key do seu projeto (veja o README).';

export function createClient() {
  if (!isSupabaseConfigured()) {
    throw new Error(NOT_CONFIGURED_MESSAGE);
  }

  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
}
