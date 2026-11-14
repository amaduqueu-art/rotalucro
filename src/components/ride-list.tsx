'use client';

import { AlertTriangle, PlusCircle, RefreshCcw, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { RideCard } from '@/components/ride-card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useRides } from '@/hooks/use-rides';
import { dayKey, dayLabel, formatBRL, todayKey } from '@/lib/format';
import type { Ride } from '@/lib/supabase/types';
import { cn } from '@/lib/utils';

const PERIODS = [
  { value: 'all', label: 'Tudo' },
  { value: 'today', label: 'Hoje' },
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
] as const;

type Period = (typeof PERIODS)[number]['value'];

function periodStart(period: Period): number {
  if (period === 'today') {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    return startOfDay.getTime();
  }

  const days = period === '7d' ? 7 : 30;
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

export function RideList() {
  const { rides, loading, error, refreshing, reload, removeRide } = useRides();
  const [period, setPeriod] = useState<Period>('all');

  const filtered = useMemo(() => {
    if (!rides) return null;
    if (period === 'all') return rides;
    const start = periodStart(period);
    return rides.filter((ride) => new Date(ride.ride_at).getTime() >= start);
  }, [rides, period]);

  const groups = useMemo(() => {
    if (!filtered) return null;

    const byDay = new Map<string, Ride[]>();
    for (const ride of filtered) {
      const key = dayKey(ride.ride_at);
      const bucket = byDay.get(key);
      if (bucket) {
        bucket.push(ride);
      } else {
        byDay.set(key, [ride]);
      }
    }
    return [...byDay.entries()];
  }, [filtered]);

  const totalProfit = useMemo(
    () => (filtered ?? []).reduce((sum, ride) => sum + ride.profit, 0),
    [filtered],
  );

  if (loading) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Carregando corridas">
        <Skeleton className="h-9 w-56" />
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-2xl border bg-card p-5 shadow-card"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="w-full space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-28" />
              </div>
              <Skeleton className="h-8 w-32 rounded-full" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          </div>
        ))}
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
          Não foi possível carregar o histórico
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

  if (rides && rides.length === 0) {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center shadow-card">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-secondary text-primary dark:text-foreground">
          <Wallet className="size-6" aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-lg font-extrabold">
          Nenhuma corrida registrada
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
          Registre a primeira corrida com o valor recebido e o abastecimento —
          o lucro líquido é calculado automaticamente.
        </p>
        <Link
          href="/registrar"
          className={cn(
            buttonVariants({ variant: 'accent', size: 'lg' }),
            'mt-6',
          )}
        >
          <PlusCircle aria-hidden="true" />
          Registrar corrida
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Filtrar por período"
          className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1"
        >
          {PERIODS.map((option) => {
            const active = period === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setPeriod(option.value)}
                className={cn(
                  'min-h-[44px] shrink-0 rounded-full border px-4 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground',
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        {filtered ? (
          <p className="text-sm font-bold tabular-nums text-muted-foreground">
            {filtered.length}{' '}
            {filtered.length === 1 ? 'corrida' : 'corridas'} ·{' '}
            <span
              className={cn(
                totalProfit >= 0
                  ? 'text-emerald-700 dark:text-emerald-300'
                  : 'text-destructive',
              )}
            >
              lucro {formatBRL(totalProfit)}
            </span>
          </p>
        ) : null}
      </div>

      {filtered && filtered.length === 0 ? (
        <p className="rounded-2xl border bg-card p-6 text-center text-sm text-muted-foreground shadow-card">
          Nenhuma corrida no período selecionado.
        </p>
      ) : null}

      <div className="space-y-6" aria-busy={refreshing || undefined}>
        {(groups ?? []).map(([key, dayRides]) => {
          const dayProfit = dayRides.reduce((sum, ride) => sum + ride.profit, 0);
          const dayFare = dayRides.reduce((sum, ride) => sum + ride.fare, 0);
          const isToday = key === todayKey();

          return (
            <section key={key} className="space-y-3">
              <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h2
                  className={cn(
                    'text-sm font-extrabold uppercase tracking-wide',
                    isToday
                      ? 'text-accent'
                      : 'text-primary dark:text-foreground',
                  )}
                >
                  {dayLabel(key)}
                </h2>
                <p className="text-xs font-medium tabular-nums text-muted-foreground">
                  {dayRides.length}{' '}
                  {dayRides.length === 1 ? 'corrida' : 'corridas'} · recebido{' '}
                  {formatBRL(dayFare)} ·{' '}
                  <span
                    className={cn(
                      'font-bold',
                      dayProfit >= 0
                        ? 'text-emerald-700 dark:text-emerald-300'
                        : 'text-destructive',
                    )}
                  >
                    lucro {formatBRL(dayProfit)}
                  </span>
                </p>
              </header>

              <div className="space-y-3">
                {dayRides.map((ride) => (
                  <RideCard
                    key={ride.id}
                    ride={ride}
                    onDeleted={removeRide}
                    onChanged={() => void reload()}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
