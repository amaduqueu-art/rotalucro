'use client';

import {
  AlertTriangle,
  Banknote,
  CalendarClock,
  Fuel,
  Gauge,
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
import {
  dayKey,
  formatBRL,
  formatProfitPerKm,
  formatKm,
  todayKey,
} from '@/lib/format';
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
      const fuel = list.reduce((sum, ride) => sum + ride.fuel_cost, 0);
      const extras = list.reduce((sum, ride) => sum + ride.extra_expenses, 0);
      const profit = list.reduce((sum, ride) => sum + ride.profit, 0);
      const km = list.reduce(
        (sum, ride) => sum + Math.max(ride.distance_km ?? 0, 0),
        0,
      );

      return {
        count: list.length,
        fare,
        fuel,
        extras,
        expenses: fuel + extras,
        profit,
        km,
        profitPerKm: km > 0 ? profit / km : null,
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
        className="flex flex-col items-start gap-3 rounded-2xl border border-destructive/30 bg-red-50 p-5 text-sm text-red-950 dark:bg-red-950/40 dark:text-red-100"
      >
        <p className="flex items-center gap-2 font-bold">
          <AlertTriangle className="size-4" aria-hidden="true" />
          Não foi possível carregar seu painel
        </p>
        <p className="text-red-900 dark:text-red-100/90">{error}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void reload()}
          className="text-red-950 hover:bg-red-100 dark:text-red-100 dark:hover:bg-red-950/60"
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
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-secondary text-primary dark:text-foreground">
          <Wallet className="size-6" aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-lg font-extrabold">
          Comece pelo primeiro registro
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          Anote o valor da corrida, o abastecimento e a quilometragem. O app
          calcula o lucro líquido na hora e monta o histórico por dia.
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
        <div className="flex items-baseline justify-between gap-2">
          <h2
            id="stats-today"
            className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-primary dark:text-foreground"
          >
            <CalendarClock className="size-4" aria-hidden="true" />
            Hoje
          </h2>
          <p className="text-xs font-semibold text-muted-foreground">
            {stats.today.count}{' '}
            {stats.today.count === 1 ? 'corrida' : 'corridas'}
          </p>
        </div>
        <StatsGrid data={stats.today} />
      </section>

      <section aria-labelledby="stats-month" className="space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2
            id="stats-month"
            className="text-sm font-extrabold uppercase tracking-wide text-primary dark:text-foreground"
          >
            Este mês
          </h2>
          <p className="text-xs font-semibold text-muted-foreground">
            {stats.month.count}{' '}
            {stats.month.count === 1 ? 'corrida' : 'corridas'}
          </p>
        </div>
        <StatsGrid data={stats.month} />
      </section>

      <section aria-labelledby="recent-rides" className="space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2
            id="recent-rides"
            className="text-sm font-extrabold uppercase tracking-wide text-primary dark:text-foreground"
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
            <RideCard
              key={ride.id}
              ride={ride}
              onDeleted={removeRide}
              onChanged={() => void reload()}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

interface StatsData {
  count: number;
  fare: number;
  fuel: number;
  extras: number;
  expenses: number;
  profit: number;
  km: number;
  profitPerKm: number | null;
}

function StatsGrid({ data }: { data: StatsData }) {
  const hasLoss = data.profit < 0;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard
        icon={<Banknote className="size-4" aria-hidden="true" />}
        label="Faturamento"
        value={formatBRL(data.fare)}
      />
      <StatCard
        icon={<Fuel className="size-4" aria-hidden="true" />}
        label="Despesas"
        value={formatBRL(data.expenses)}
        hint={
          data.extras > 0
            ? `combustível ${formatBRL(data.fuel)} + extras ${formatBRL(
                data.extras,
              )}`
            : `combustível ${formatBRL(data.fuel)}`
        }
      />
      <div className="rounded-2xl bg-primary p-4 text-primary-foreground shadow-card sm:p-5">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-primary-foreground/80">
          {hasLoss ? (
            <TrendingDown className="size-4" aria-hidden="true" />
          ) : (
            <TrendingUp className="size-4" aria-hidden="true" />
          )}
          Lucro líquido
        </p>
        <p
          className={cn(
            'mt-1.5 text-xl font-extrabold tabular-nums tracking-tight sm:text-2xl',
            hasLoss && 'text-accent-bright',
          )}
        >
          {formatBRL(data.profit)}
        </p>
        <p className="mt-1 text-[11px] font-medium text-primary-foreground/70">
          {data.profitPerKm === null
            ? 'sem KM registrado'
            : formatProfitPerKm(data.profitPerKm)}
        </p>
      </div>
      <StatCard
        icon={<Gauge className="size-4" aria-hidden="true" />}
        label="KM rodado"
        value={formatKm(data.km)}
      />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
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
      {hint ? (
        <p className="mt-1 line-clamp-2 text-[11px] font-medium text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
