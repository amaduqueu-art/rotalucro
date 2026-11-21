import type { Metadata } from 'next';

import { ReportGenerator } from '@/components/report-generator';

export const metadata: Metadata = {
  title: 'Relatórios',
};

export default function RelatoriosPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-extrabold tracking-tight">
          Relatórios de corridas
        </h1>
        <p className="text-sm text-muted-foreground">
          Emita relatórios diários, semanais, mensais, trimestrais, semestrais ou
          anuais. Imprima ou salve como PDF.
        </p>
      </header>
      <ReportGenerator />
    </div>
  );
}
