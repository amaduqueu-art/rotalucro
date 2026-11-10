import { redirect } from 'next/navigation';

import { BottomNav } from '@/components/bottom-nav';
import { ConfigNotice } from '@/components/config-notice';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';

export const dynamic = 'force-dynamic';

/**
 * Shell das telas protegidas: cabeçalho, rodapé e navegação inferior.
 * O acesso exige sessão válida (login e senha via Supabase Auth).
 *
 * Sem as variáveis de ambiente o shell renderiza sem autenticação e o
 * ConfigNotice explica como configurar (não há dados para proteger).
 */
export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = createClient();

  let email = 'motorista';

  if (supabase) {
    let user = null;

    try {
      const result = await supabase.auth.getUser();
      user = result.data.user;
    } catch {
      user = null;
    }

    if (!user) {
      redirect('/entrar');
    }

    email = user.email ?? 'motorista';
  }

  return (
    <>
      <SiteHeader email={email} />
      <main
        id="conteudo"
        className="container flex-1 pb-28 pt-6 md:pb-16 md:pt-10"
      >
        <ConfigNotice />
        {children}
      </main>
      <SiteFooter />
      <BottomNav />
    </>
  );
}
