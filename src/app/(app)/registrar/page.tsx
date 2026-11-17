import type { Metadata } from 'next';

import { RideForm, RideFormTips } from '@/components/ride-form';
import { LIMITS } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Registrar corrida',
};

interface RegistrarPageProps {
  searchParams?: { valor?: string | string[] };
}

export default function RegistrarPage({ searchParams }: RegistrarPageProps) {
  const raw = Array.isArray(searchParams?.valor)
    ? searchParams?.valor[0]
    : searchParams?.valor;

  const parsed = raw ? Number(raw.replace(',', '.')) : NaN;
  const initialFare =
    Number.isFinite(parsed) && parsed > 0 && parsed <= LIMITS.fareMax
      ? parsed
      : undefined;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-extrabold tracking-tight">
            Registrar corrida
          </h1>
          <p className="text-sm text-muted-foreground">
            Valor por voz, combustível calculado e lucro na hora.
          </p>
          {initialFare !== undefined ? (
            <p className="rounded-xl border border-accent/30 bg-accent/5 px-3 py-2 text-sm text-foreground">
              O assistente preencheu o valor da corrida. Confira o combustível
              e o KM antes de salvar.
            </p>
          ) : null}
        </header>

        <div className="rounded-2xl border bg-card p-5 shadow-card sm:p-6">
          <RideForm initialFare={initialFare} />
        </div>
      </div>

      <RideFormTips />
    </div>
  );
}
