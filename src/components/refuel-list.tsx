'use client';

import {
  AlertTriangle,
  Fuel,
  Loader2,
  PlusCircle,
  RefreshCcw,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { RefuelDialog } from '@/components/refuel-dialog';
import { Button, buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useRides } from '@/hooks/use-rides';
import {
  dayKey,
  dayLabel,
  formatBRL,
  formatDateTime,
  formatFuelQuantity,
  formatUnitPrice,
} from '@/lib/format';
import type { FuelRefuel } from '@/lib/supabase/types';
import { cn, getErrorMessage } from '@/lib/utils';

interface RefuelListProps {
  /** Quantidade máxima de itens exibidos (padrão: todos). */
  limit?: number;
}

/**
 * Histórico de abastecimentos. Abastecimento é um evento independente da
 * corrida: aqui o motorista confere o que pagou na bomba e pode corrigir um
 * lançamento feito por engano.
 */
export function RefuelList({ limit }: RefuelListProps) {
  const {
    refuels,
    loading,
    error,
    refuelsError,
    reload,
    addRefuel,
    removeRefuel,
  } = useRides();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Exclusão em dois toques, no mesmo padrão das corridas.
  useEffect(() => {
    if (!confirmingId) return;
    const timer = setTimeout(() => setConfirmingId(null), 4000);
    return () => clearTimeout(timer);
  }, [confirmingId]);

  const totals = useMemo(() => {
    const selected = limit ? refuels.slice(0, limit) : refuels;
    return {
      count: selected.length,
      cost: selected.reduce((sum, refuel) => sum + refuel.total_cost, 0),
      quantity: selected.reduce((sum, refuel) => sum + refuel.quantity, 0),
    };
  }, [limit, refuels]);

  const groups = useMemo(() => {
    const byDay = new Map<string, FuelRefuel[]>();
    for (const refuel of refuels) {
      const key = dayKey(refuel.fueled_at);
      const bucket = byDay.get(key);
      if (bucket) {
        bucket.push(refuel);
      } else {
        byDay.set(key, [refuel]);
      }
    }
    return [...byDay.entries()];
  }, [refuels]);

  async function handleDelete(refuel: FuelRefuel) {
    if (deletingId) return;
    if (confirmingId !== refuel.id) {
      setConfirmingId(refuel.id);
      return;
    }

    setDeletingId(refuel.id);

    try {
      await removeRefuel(refuel.id);
      toast.success('Abastecimento removido.');
      setConfirmingId(null);
    } catch (deleteError) {
      toast.error('Não foi possível remover o abastecimento', {
        description: getErrorMessage(deleteError, 'Tente novamente.'),
      });
      setConfirmingId(null);
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Carregando abastecimentos">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-24 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (error || refuelsError) {
    return (
      <div
        role="alert"
        className="flex flex-col items-start gap-3 rounded-2xl border border-destructive/30 bg-red-50 p-5 text-sm text-red-950 dark:bg-red-950/40 dark:text-red-100"
      >
        <p className="flex items-center gap-2 font-bold">
          <AlertTriangle className="size-4" aria-hidden="true" />
          Não foi possível carregar os abastecimentos
        </p>
        <p className="text-red-900 dark:text-red-100/90">{error ?? refuelsError}</p>
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

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <SummaryCard
          label="Gasto na bomba"
          value={formatBRL(totals.cost)}
          hint={`${totals.count} ${totals.count === 1 ? 'abastecimento' : 'abastecimentos'}`}
        />
        <SummaryCard
          label="Quantidade"
          value={`${totals.quantity.toFixed(2).replace('.', ',')}`}
          hint="litros ou m³"
        />
        <SummaryCard
          label="Rateado nas corridas"
          value="automático"
          hint="proporcional aos KM"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-bold text-muted-foreground">
          {totals.count}{' '}
          {totals.count === 1 ? 'abastecimento registrado' : 'abastecimentos registrados'}
        </p>
        <Button variant="accent" onClick={() => setDialogOpen(true)}>
          <PlusCircle aria-hidden="true" />
          Registrar abastecimento
        </Button>
      </div>

      {refuels.length === 0 ? (
        <div className="rounded-2xl border bg-card p-8 text-center shadow-card">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-secondary text-primary dark:text-foreground">
            <Fuel className="size-6" aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-lg font-extrabold">
            Nenhum abastecimento registrado
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            Registre o abastecimento somente quando for abastecer. O custo será
            dividido entre as corridas seguintes — você não precisa informar
            combustível a cada corrida.
          </p>
          <Button
            variant="accent"
            size="lg"
            onClick={() => setDialogOpen(true)}
            className="mt-6"
          >
            <PlusCircle aria-hidden="true" />
            Registrar primeiro abastecimento
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(([day, items]) => (
            <section key={day} className="space-y-3">
              <h2 className="text-sm font-extrabold uppercase tracking-wide text-primary dark:text-foreground">
                {dayLabel(day)}
              </h2>
              <ul className="space-y-3">
                {items.map((refuel) => {
                  const confirming = confirmingId === refuel.id;
                  const deleting = deletingId === refuel.id;

                  return (
                    <li
                      key={refuel.id}
                      className="animate-fade-in rounded-2xl border bg-card p-4 shadow-card sm:p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 text-sm font-bold">
                            <Fuel className="size-4 shrink-0 text-accent" aria-hidden="true" />
                            {formatDateTime(refuel.fueled_at)}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatFuelQuantity(refuel.quantity, refuel.fuel_type)} ·{' '}
                            {formatUnitPrice(refuel.unit_price, refuel.fuel_type)}
                            {refuel.station ? ` · ${refuel.station}` : ''}
                          </p>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <p className="text-xl font-extrabold tabular-nums">
                            {formatBRL(refuel.total_cost)}
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void handleDelete(refuel)}
                            disabled={deleting}
                            className={cn(
                              'text-destructive hover:bg-red-50 hover:text-destructive dark:hover:bg-red-950/40',
                              confirming &&
                                'border-destructive bg-destructive text-destructive-foreground hover:bg-destructive hover:text-destructive-foreground',
                            )}
                          >
                            {deleting ? (
                              <Loader2 className="animate-spin" aria-hidden="true" />
                            ) : (
                              <Trash2 aria-hidden="true" />
                            )}
                            {deleting
                              ? 'Removendo...'
                              : confirming
                                ? 'Confirmar exclusão'
                                : 'Excluir'}
                          </Button>
                        </div>
                      </div>

                      {refuel.notes ? (
                        <p className="mt-3 rounded-lg bg-secondary/70 p-3 text-xs leading-relaxed text-muted-foreground">
                          {refuel.notes}
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      <p className="text-xs leading-relaxed text-muted-foreground">
        Excluir um abastecimento recalcula a parcela de combustível das corridas
        seguintes. Para corrigir um valor, registre o abastecimento correto e
        exclua o anterior.
      </p>

      <Link
        href="/historico"
        className={cn(buttonVariants({ variant: 'outline' }))}
      >
        Ver corridas e parcelas rateadas
      </Link>

      <RefuelDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={addRefuel}
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-card sm:p-5">
      <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1.5 text-xl font-extrabold tabular-nums text-foreground sm:text-2xl">
        {value}
      </p>
      <p className="mt-1 text-[11px] font-medium text-muted-foreground">{hint}</p>
    </div>
  );
}
