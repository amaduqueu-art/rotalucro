import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { RideForm, RideFormTips } from '@/components/ride-form';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Editar corrida',
};

interface PageProps {
  params: { id: string };
}

export default async function EditarCorridaPage({ params }: PageProps) {
  const supabase = createClient();

  // Sem configuração do Supabase não há dados para editar: 404 é o correto.
  if (!supabase) {
    notFound();
  }

  let user = null;

  try {
    const result = await supabase.auth.getUser();
    user = result.data.user;
  } catch {
    user = null;
  }

  if (!user) {
    notFound();
  }

  const { data: ride } = await supabase
    .from('rides')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();

  // RLS garante que só o dono enxerga a corrida; caso contrário é 404.
  if (!ride) {
    notFound();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-6">
        <header className="space-y-1">
          <Link
            href="/historico"
            className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-bold text-primary hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Voltar ao histórico
          </Link>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Editar corrida
          </h1>
          <p className="text-sm text-muted-foreground">
            Ajuste valores, complete o KM final, mude a forma de pagamento ou
            gere o QR Code PIX da corrida.
          </p>
        </header>

        <div className="rounded-2xl border bg-card p-5 shadow-card sm:p-6">
          <RideForm ride={ride} />
        </div>
      </div>

      <RideFormTips />
    </div>
  );
}
