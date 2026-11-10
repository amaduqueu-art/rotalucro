'use client';

import {
  CalendarClock,
  Fuel,
  Loader2,
  Pencil,
  Trash2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button, buttonVariants } from '@/components/ui/button';
import { getFuelOption } from '@/lib/constants';
import {
  formatBRL,
  formatDateTime,
  formatFuelQuantity,
  formatKm,
} from '@/lib/format';
import { createClient } from '@/lib/supabase/client';
import type { Ride } from '@/lib/supabase/types';
import { cn, getErrorMessage } from '@/lib/utils';

interface RideCardProps {
  ride: Ride;
  /** Atualiza a lista pai após excluir. */
  onDeleted?: (id: string) => void;
}

export function RideCard({ ride, onDeleted }: RideCardProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Exclusão em dois toques: o primeiro arma o botão por 4 segundos.
  useEffect(() => {
    if (!confirmingDelete) return;
    const timer = setTimeout(() => setConfirmingDelete(false), 4000);
    return () => clearTimeout(timer);
  }, [confirmingDelete]);

  const fuel = getFuelOption(ride.fuel_type);
  const distance =
    ride.km_final !== null ? ride.km_final - ride.km_initial : null;
  const hasLoss = ride.profit < 0;

  async function handleDelete() {
    if (deleting) return;
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }

    setDeleting(true);

    try {
      const { error } = await createClient()
        .from('rides')
        .delete()
        .eq('id', ride.id);
      if (error) throw error;

      toast.success('Corrida excluída.');
      onDeleted?.(ride.id);
    } catch (error) {
      toast.error('Não foi possível excluir', {
        description: getErrorMessage(error, 'Tente novamente.'),
      });
      setConfirmingDelete(false);
      setDeleting(false);
    }
  }

  return (
    <article className="animate-fade-in rounded-2xl border bg-card p-4 shadow-card sm:p-5">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-bold text-foreground">
            <CalendarClock
              className="size-4 shrink-0 text-primary"
              aria-hidden="true"
            />
            {formatDateTime(ride.ride_at)}
          </p>
          <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Fuel className="size-3.5 shrink-0" aria-hidden="true" />
            {fuel.label} · {formatFuelQuantity(ride.fuel_quantity, ride.fuel_type)}
          </p>
        </div>

        <p
          className={cn(
            'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-extrabold tabular-nums',
            hasLoss
              ? 'bg-red-100 text-red-900'
              : 'bg-emerald-100 text-emerald-900',
          )}
        >
          {hasLoss ? (
            <TrendingDown className="size-4 shrink-0" aria-hidden="true" />
          ) : (
            <TrendingUp className="size-4 shrink-0" aria-hidden="true" />
          )}
          Lucro {formatBRL(ride.profit)}
        </p>
      </header>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Recebido
          </dt>
          <dd className="mt-0.5 text-sm font-bold tabular-nums">
            {formatBRL(ride.fare)}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Combustível
          </dt>
          <dd className="mt-0.5 text-sm font-bold tabular-nums">
            {formatBRL(ride.fuel_cost)}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            KM inicial
          </dt>
          <dd className="mt-0.5 text-sm font-bold tabular-nums">
            {formatKm(ride.km_initial)}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            KM final
          </dt>
          <dd className="mt-0.5 text-sm font-bold tabular-nums">
            {ride.km_final === null ? (
              <span className="font-normal text-muted-foreground">
                próximo abastecimento
              </span>
            ) : (
              <>
                {formatKm(ride.km_final)}
                {distance !== null && distance > 0 ? (
                  <span className="ml-1 font-normal text-muted-foreground">
                    ({distance.toLocaleString('pt-BR', {
                      maximumFractionDigits: 1,
                    })}{' '}
                    km rodados)
                  </span>
                ) : null}
              </>
            )}
          </dd>
        </div>
      </dl>

      {ride.notes ? (
        <p className="mt-3 rounded-lg bg-secondary/70 p-3 text-xs leading-relaxed text-muted-foreground">
          {ride.notes}
        </p>
      ) : null}

      <footer className="mt-4 flex items-center justify-end gap-2 border-t pt-3">
        <Link
          href={`/corrida/${ride.id}`}
          className={cn(
            buttonVariants({ variant: 'outline', size: 'sm' }),
            'text-primary hover:text-accent',
          )}
        >
          <Pencil aria-hidden="true" />
          Editar
        </Link>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDelete}
          disabled={deleting}
          className={cn(
            'text-destructive hover:bg-red-50 hover:text-destructive',
            confirmingDelete &&
              'border-destructive bg-destructive text-destructive-foreground hover:bg-destructive hover:text-destructive-foreground',
          )}
        >
          {deleting ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <Trash2 aria-hidden="true" />
          )}
          {confirmingDelete ? 'Confirmar exclusão' : 'Excluir'}
        </Button>
      </footer>
    </article>
  );
}
