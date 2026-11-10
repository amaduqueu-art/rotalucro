'use client';

import {
  AlertTriangle,
  Banknote,
  CalendarClock,
  Fuel,
  PlusCircle,
  RefreshCcw,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';

import { RideCard } from '@/components/ride-card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useRides } from '@/hooks/use-rides';
import { dayKey, formatBRL, todayKey } from '@/lib/format';
import type { Ride } from '@/lib/supabase/types';
import { cn } from '@/lib/utils';

export function DashboardContent() {
  const { rides, loading, error, reload, removeRide } = useRides();

  const stats = useMemo(() => {
    if (!rides) return null;

    const today = todayKey();
    const month = today.slice(0, 7);

    const summarize = (list: Ride[]) => {
      const fare = list.reduce((sum, ride) => sum + ride.fare, 0);
      const cost = list.reduce((sum, ride) => sum + ride.fuel_cost, 0);
      return {
        count: list.length,
        fare,
        cost,
        profit: fare - cost,
      };
    };

    const todayRides = rides.filter((ride) => dayKey(ride.ride_at) === today);
    const monthRides = rides.filter((ride) =>
      dayKey(ride.ride_at).startsWith(month),
    );

    return { today: summarize(todayRides), month: summarize(monthRides) };
  }, [rides]);

  if (loading) {
    return (
      <div className="space-y-8" aria-busy="true" aria-label="Carregando painel">
        {[0, 1].map((section) => (
          <div key={section} className="space-y-3">
            <Skeleton className="h-5 w-28" />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-24 rounded-2xl" />
              ))}
            </div>
          </div>
        ))}
        <div className="space-y-3">
          <Skeleton className="h-5 w-36" />
          {Array.from({ length: 2 }).map((_, index) => (
            <Skeleton key={index} className="h-44 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="flex flex-col items-start gap-3 rounded-2xl border border-destructive/30 bg-red-50 p-5 text-sm text-red-950"
      >
        <p className="flex items-center gap-2 font-bold">
          <AlertTriangle className="size-4" aria-hidden="true" />
          Não foi possível carregar seu painel
        </p>
        <p className="text-red-900">{error}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void reload()}
          className="text-red-950 hover:bg-red-100"
        >
          <RefreshCcw aria-hidden="true" />
          Tentar de novo
        </Button>
      </div>
    );
  }

  if (!stats) return null;

  if (rides && rides.length === 0) {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center shadow-card">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-secondary text-primary">
          <Wallet className="size-6" aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-lg font-extrabold">
          Comece pelo primeiro registro
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          Anote o valor recebido na corrida e o gasto do abastecimento. O app
          calcula o lucro na hora e monta o histórico por dia.
        </p>
        <Link
          href="/registrar"
          className={cn(
            buttonVariants({ variant: 'accent', size: 'lg' }),
            'mt-6',
          )}
        >
          <PlusCircle aria-hidden="true" />
          Registrar primeira corrida
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section aria-labelledby="stats-today" className="space-y-3">
        <h2
          id="stats-today"
          className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-primary"
        >
          <CalendarClock className="size-4" aria-hidden="true" />
          Hoje
        </h2>
        <StatsGrid data={stats.today} />
      </section>

      <section aria-labelledby="stats-month" className="space-y-3">
        <h2
          id="stats-month"
          className="text-sm font-extrabold uppercase tracking-wide text-primary"
        >
          Este mês
        </h2>
        <StatsGrid data={stats.month} />
      </section>

      <section aria-labelledby="recent-rides" className="space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2
            id="recent-rides"
            className="text-sm font-extrabold uppercase tracking-wide text-primary"
          >
            Últimas corridas
          </h2>
          <Link
            href="/historico"
            className="inline-flex min-h-[44px] items-center text-sm font-bold text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Ver histórico
          </Link>
        </div>
        <div className="space-y-3">
          {(rides ?? []).slice(0, 3).map((ride) => (
            <RideCard key={ride.id} ride={ride} onDeleted={removeRide} />
          ))}
        </div>
      </section>
    </div>
  );
}

interface StatsData {
  count: number;
  fare: number;
  cost: number;
  profit: number;
}

function StatsGrid({ data }: { data: StatsData }) {
  const hasLoss = data.profit < 0;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard
        icon={<CalendarClock className="size-4" aria-hidden="true" />}
        label="Corridas"
        value={String(data.count)}
      />
      <StatCard
        icon={<Banknote className="size-4" aria-hidden="true" />}
        label="Recebido"
        value={formatBRL(data.fare)}
      />
      <StatCard
        icon={<Fuel className="size-4" aria-hidden="true" />}
        label="Combustível"
        value={formatBRL(data.cost)}
      />
      <div className="rounded-2xl bg-primary p-4 text-primary-foreground shadow-card sm:p-5">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-primary-foreground/80">
          {hasLoss ? (
            <TrendingDown className="size-4" aria-hidden="true" />
          ) : (
            <TrendingUp className="size-4" aria-hidden="true" />
          )}
          Lucro
        </p>
        <p
          className={cn(
            'mt-1.5 text-xl font-extrabold tabular-nums tracking-tight sm:text-2xl',
            hasLoss && 'text-accent-bright',
          )}
        >
          {formatBRL(data.profit)}
        </p>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-card sm:p-5">
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="mt-1.5 text-xl font-extrabold tabular-nums tracking-tight text-foreground sm:text-2xl">
        {value}
      </p>
    </div>
  );
}
