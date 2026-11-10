import type { Metadata } from 'next';

import { DashboardContent } from '@/components/dashboard-content';

export const metadata: Metadata = {
  title: 'Painel',
};

export default function HomePage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-extrabold tracking-tight">
          Seu painel do dia
        </h1>
        <p className="text-sm text-muted-foreground">
          Corridas, abastecimento e lucro calculado automaticamente.
        </p>
      </header>
      <DashboardContent />
    </div>
  );
}
