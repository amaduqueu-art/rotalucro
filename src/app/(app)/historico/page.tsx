import Link from 'next/link';
import type { Metadata } from 'next';

import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RideList } from '@/components/ride-list';

export const metadata: Metadata = {
  title: 'Histórico',
};

export default function HistoricoPage() {
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold tracking-tight">
            Histórico de corridas
          </h1>
          <p className="text-sm text-muted-foreground">
            Todas as corridas organizadas por dia, com forma de pagamento e lucro
            líquido em destaque.
          </p>
        </div>
        <Link
          href="/relatorios"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
        >
          Gerar relatório (PDF)
        </Link>
      </header>
      <RideList />
    </div>
  );
}
