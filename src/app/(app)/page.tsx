import Link from 'next/link';
import type { Metadata } from 'next';

import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DashboardContent } from '@/components/dashboard-content';

export const metadata: Metadata = {
  title: 'Painel',
};

export default function HomePage() {
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold tracking-tight">
            Seu painel do dia
          </h1>
          <p className="text-sm text-muted-foreground">
            Faturamento, despesas, lucro líquido e quilômetros rodados.
          </p>
        </div>
        <Link
          href="/relatorios"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
        >
          Gerar relatório (PDF)
        </Link>
      </header>
      <DashboardContent />
    </div>
  );
}
