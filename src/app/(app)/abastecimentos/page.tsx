import type { Metadata } from 'next';

import { RefuelList } from '@/components/refuel-list';

export const metadata: Metadata = {
  title: 'Abastecimentos',
};

export default function AbastecimentosPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-extrabold tracking-tight">
          Abastecimentos
        </h1>
        <p className="text-sm text-muted-foreground">
          Todo valor pago na bomba, organizado por dia. O custo é dividido entre
          as corridas seguintes — nunca descontado inteiro de uma única corrida.
        </p>
      </header>
      <RefuelList />
    </div>
  );
}
