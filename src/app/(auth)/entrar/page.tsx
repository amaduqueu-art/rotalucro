import type { Metadata } from 'next';
import { CarTaxiFront } from 'lucide-react';

import { AuthForm } from '@/components/auth-form';
import { ConfigNotice } from '@/components/config-notice';
import { ThemeToggle } from '@/components/theme-toggle';
import { BRAND } from '@/lib/brand';

export const metadata: Metadata = {
  title: 'Entrar',
};

// Lê as variáveis de ambiente em tempo de requisição (deploy-friendly).
export const dynamic = 'force-dynamic';

export default function EntrarPage() {
  return (
    <div className="container relative flex flex-1 flex-col items-center justify-center py-10">
      <div className="absolute right-4 top-4">
        <ThemeToggle className="text-foreground hover:bg-secondary" />
      </div>

      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-raised">
            <CarTaxiFront className="size-7" aria-hidden="true" />
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight">
            <span className="text-primary dark:text-foreground">
              {BRAND.shortName}
            </span>
            <span className="text-accent">ComLucro</span>
          </h1>
          <p className="text-balance text-sm leading-relaxed text-muted-foreground">
            Controle o dinheiro das suas corridas: receita, combustível, PIX e
            lucro — tudo na palma da mão.
          </p>
          <p className="text-xs font-semibold text-muted-foreground">
            por {BRAND.owner}
          </p>
        </div>

        <ConfigNotice />
        <AuthForm />

        <p className="text-center text-xs text-muted-foreground">
          Seus dados financeiros ficam protegidos: só a sua conta enxerga as
          suas corridas.
        </p>
      </div>
    </div>
  );
}
