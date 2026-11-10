export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** Indica se as variáveis de ambiente do Supabase estão preenchidas. */
export function isSupabaseConfigured(): boolean {
  return SUPABASE_URL.startsWith('http') && SUPABASE_ANON_KEY.length > 20;
}
