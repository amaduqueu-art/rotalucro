import { AlertTriangle } from 'lucide-react';

import { isSupabaseConfigured } from '@/lib/supabase/env';

/**
 * Aviso exibido quando as variáveis de ambiente do Supabase não foram
 * configuradas. Desaparece assim que `.env.local` (ou as variáveis do
 * deploy) estiverem preenchidas.
 */
export function ConfigNotice() {
  if (isSupabaseConfigured()) return null;

  return (
    <div
      role="alert"
      className="mb-6 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"
    >
      <AlertTriangle
        className="mt-0.5 size-4 shrink-0 text-amber-700"
        aria-hidden="true"
      />
      <div className="min-w-0">
        <p className="font-bold">Supabase ainda não configurado</p>
        <p className="mt-1 leading-relaxed">
          Defina <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> e{' '}
          <code className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> no{' '}
          <code className="font-mono">.env.local</code> (copie de{' '}
          <code className="font-mono">.env.example</code>), execute o script{' '}
          <code className="font-mono">supabase/schema.sql</code> no seu projeto
          e reinicie o app. Veja o passo a passo no README.
        </p>
      </div>
    </div>
  );
}
