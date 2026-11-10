import type { Metadata } from 'next';

import { RideList } from '@/components/ride-list';

export const metadata: Metadata = {
  title: 'Histórico',
};

export default function HistoricoPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-extrabold tracking-tight">
          Histórico de corridas
        </h1>
        <p className="text-sm text-muted-foreground">
          Todas as corridas pagas, organizadas por dia, com o lucro em destaque.
        </p>
      </header>
      <RideList />
    </div>
  );
}
