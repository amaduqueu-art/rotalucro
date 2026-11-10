import type { Metadata } from 'next';

import { RideForm, RideFormTips } from '@/components/ride-form';

export const metadata: Metadata = {
  title: 'Registrar corrida',
};

export default function RegistrarPage() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-extrabold tracking-tight">
            Registrar corrida
          </h1>
          <p className="text-sm text-muted-foreground">
            Valor recebido, abastecimento e quilometragem — o lucro aparece na
            hora.
          </p>
        </header>

        <div className="rounded-2xl border bg-card p-5 shadow-card sm:p-6">
          <RideForm />
        </div>
      </div>

      <RideFormTips />
    </div>
  );
}
