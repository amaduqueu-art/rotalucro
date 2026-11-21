'use client';

import { FileText, Printer } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useRides } from '@/hooks/use-rides';
import {
  formatBRL,
  formatDateTime,
  formatFuelType,
  formatKm,
  formatPaymentMethod,
} from '@/lib/format';
import {
  REPORT_PERIOD_LABELS,
  type ReportPeriod,
  formatRange,
  getPeriodRange,
} from '@/lib/report-periods';
import type { Ride } from '@/lib/supabase/types';

function rideDistance(ride: Ride): number {
  if (ride.distance_km !== null && ride.distance_km !== undefined) {
    return Number(ride.distance_km);
  }
  if (ride.km_final !== null && ride.km_final !== undefined) {
    return Number(ride.km_final) - Number(ride.km_initial);
  }
  return 0;
}

export function ReportGenerator() {
  const { rides, refuels, loading } = useRides();
  const reportRef = useRef<HTMLDivElement>(null);

  const [period, setPeriod] = useState<ReportPeriod>('mensal');
  const [referenceDate, setReferenceDate] = useState<string>(
    new Date().toISOString().slice(0, 10),
  );

  // Dados opcionais do motorista
  const [driverName, setDriverName] = useState('');
  const [driverCpf, setDriverCpf] = useState('');
  const [workDate, setWorkDate] = useState('');
  const [workStart, setWorkStart] = useState('');
  const [workEnd, setWorkEnd] = useState('');

  const range = useMemo(
    () => getPeriodRange(period, new Date(`${referenceDate}T12:00:00`)),
    [period, referenceDate],
  );

  const filteredRides = useMemo(() => {
    if (!rides) return [];
    return rides
      .filter((ride) => {
        const at = new Date(ride.ride_at);
        return at >= range.start && at <= range.end;
      })
      .sort(
        (a, b) =>
          new Date(a.ride_at).getTime() - new Date(b.ride_at).getTime(),
      );
  }, [rides, range]);

  const lastRefuel = useMemo(() => {
    if (!refuels || refuels.length === 0) return null;
    const candidates = refuels
      .filter((r) => new Date(r.fueled_at) <= range.end)
      .sort(
        (a, b) =>
          new Date(b.fueled_at).getTime() - new Date(a.fueled_at).getTime(),
      );
    return candidates[0] ?? null;
  }, [refuels, range]);

  const totals = useMemo(() => {
    return filteredRides.reduce(
      (acc, ride) => {
        const km = rideDistance(ride);
        acc.rides += 1;
        acc.km += km;
        acc.fare += Number(ride.fare);
        acc.fuelCost += Number(ride.fuel_cost);
        acc.extra += Number(ride.extra_expenses);
        acc.profit += Number(ride.fare) - Number(ride.fuel_cost) - Number(ride.extra_expenses);
        return acc;
      },
      { rides: 0, km: 0, fare: 0, fuelCost: 0, extra: 0, profit: 0 },
    );
  }, [filteredRides]);

  const emittedAt = useMemo(() => new Date(), []);

  function handlePrint() {
    window.print();
  }

  return (
    <div className="space-y-6">
      <div className="no-print space-y-5 rounded-2xl border bg-card p-5 shadow-card sm:p-6">
        <div className="space-y-1">
          <h2 className="text-lg font-extrabold tracking-tight">
            Gerar relatório de corridas
          </h2>
          <p className="text-sm text-muted-foreground">
            Escolha o período, revise os dados e imprima ou salve como PDF.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="report-period">Período</Label>
            <Select
              id="report-period"
              value={period}
              onChange={(event) => setPeriod(event.target.value as ReportPeriod)}
            >
              {(Object.keys(REPORT_PERIOD_LABELS) as ReportPeriod[]).map((key) => (
                <option key={key} value={key}>
                  {REPORT_PERIOD_LABELS[key]}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="report-ref">Data de referência</Label>
            <Input
              id="report-ref"
              type="date"
              value={referenceDate}
              onChange={(event) => setReferenceDate(event.target.value)}
            />
          </div>
        </div>

        <details className="rounded-xl border bg-secondary/40 p-4">
          <summary className="cursor-pointer text-sm font-bold text-foreground">
            Dados opcionais do motorista e do turno
          </summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="driver-name">Nome do motorista</Label>
              <Input
                id="driver-name"
                value={driverName}
                onChange={(event) => setDriverName(event.target.value)}
                placeholder="Ex.: João da Silva"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="driver-cpf">CPF</Label>
              <Input
                id="driver-cpf"
                value={driverCpf}
                onChange={(event) => setDriverCpf(event.target.value)}
                placeholder="000.000.000-00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="work-date">Data do turno</Label>
              <Input
                id="work-date"
                type="date"
                value={workDate}
                onChange={(event) => setWorkDate(event.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="work-start">Início</Label>
                <Input
                  id="work-start"
                  type="time"
                  value={workStart}
                  onChange={(event) => setWorkStart(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="work-end">Fim</Label>
                <Input
                  id="work-end"
                  type="time"
                  value={workEnd}
                  onChange={(event) => setWorkEnd(event.target.value)}
                />
              </div>
            </div>
          </div>
        </details>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="accent" onClick={handlePrint}>
            <Printer className="size-4" aria-hidden="true" />
            Imprimir / Salvar como PDF
          </Button>
          <span className="text-xs text-muted-foreground">
            {filteredRides.length} corrida(s) no período {formatRange(range)}.
          </span>
        </div>
      </div>

      <div
        ref={reportRef}
        className="report-print-area rounded-2xl border bg-card p-6 shadow-card print:shadow-none print:border-0"
      >
        <header className="mb-6 border-b pb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-extrabold tracking-tight">
                Relatório de Corridas — {REPORT_PERIOD_LABELS[period]}
              </h1>
              <p className="text-sm text-muted-foreground">
                Período: {formatRange(range)}
              </p>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <p>Emitido em: {formatDateTime(emittedAt)}</p>
            </div>
          </div>

          {(driverName || driverCpf || workDate || workStart || workEnd) && (
            <div className="mt-4 grid gap-1 text-sm">
              {driverName && (
                <p>
                  <span className="font-semibold">Motorista:</span> {driverName}
                </p>
              )}
              {driverCpf && (
                <p>
                  <span className="font-semibold">CPF:</span> {driverCpf}
                </p>
              )}
              {(workDate || workStart || workEnd) && (
                <p>
                  <span className="font-semibold">Turno:</span>{' '}
                  {workDate ? `${workDate.split('-').reverse().join('/')}` : ''}
                  {workStart || workEnd
                    ? ` — ${workStart || '--:--'} às ${workEnd || '--:--'}`
                    : ''}
                </p>
              )}
            </div>
          )}
        </header>

        {lastRefuel && (
          <section className="mb-6 rounded-xl border bg-secondary/40 p-4 text-sm">
            <h2 className="mb-1 font-bold">Último abastecimento</h2>
            <p>
              Data: {formatDateTime(lastRefuel.fueled_at)} — Combustível:{' '}
              {formatFuelType(lastRefuel.fuel_type)}
              {lastRefuel.station ? ` — Posto: ${lastRefuel.station}` : ''}
            </p>
          </section>
        )}

        <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border p-3">
            <p className="text-xs text-muted-foreground">Corridas</p>
            <p className="text-lg font-extrabold">{totals.rides}</p>
          </div>
          <div className="rounded-xl border p-3">
            <p className="text-xs text-muted-foreground">KM rodados</p>
            <p className="text-lg font-extrabold">{formatKm(totals.km)}</p>
          </div>
          <div className="rounded-xl border p-3">
            <p className="text-xs text-muted-foreground">Faturamento</p>
            <p className="text-lg font-extrabold">{formatBRL(totals.fare)}</p>
          </div>
          <div className="rounded-xl border p-3">
            <p className="text-xs text-muted-foreground">Lucro líquido</p>
            <p className="text-lg font-extrabold">{formatBRL(totals.profit)}</p>
          </div>
        </section>

        {filteredRides.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhuma corrida no período selecionado.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3">Data/Hora</th>
                  <th className="py-2 pr-3">KM rodados</th>
                  <th className="py-2 pr-3">Valor</th>
                  <th className="py-2 pr-3">Combustível rateado</th>
                  <th className="py-2 pr-3">Pagamento</th>
                  <th className="py-2 pr-3">Lucro</th>
                </tr>
              </thead>
              <tbody>
                {filteredRides.map((ride) => {
                  const km = rideDistance(ride);
                  const profit =
                    Number(ride.fare) -
                    Number(ride.fuel_cost) -
                    Number(ride.extra_expenses);
                  return (
                    <tr key={ride.id} className="border-b last:border-0">
                      <td className="py-2 pr-3 whitespace-nowrap">
                        {formatDateTime(ride.ride_at)}
                      </td>
                      <td className="py-2 pr-3">{formatKm(km)}</td>
                      <td className="py-2 pr-3">{formatBRL(Number(ride.fare))}</td>
                      <td className="py-2 pr-3">
                        {formatBRL(Number(ride.fuel_cost))}
                      </td>
                      <td className="py-2 pr-3">
                        {formatPaymentMethod(ride.payment_method)}
                      </td>
                      <td className="py-2 pr-3">{formatBRL(profit)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t font-bold">
                  <td className="py-2 pr-3">Total</td>
                  <td className="py-2 pr-3">{formatKm(totals.km)}</td>
                  <td className="py-2 pr-3">{formatBRL(totals.fare)}</td>
                  <td className="py-2 pr-3">{formatBRL(totals.fuelCost)}</td>
                  <td className="py-2 pr-3" />
                  <td className="py-2 pr-3">{formatBRL(totals.profit)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        <footer className="mt-6 border-t pt-3 text-xs text-muted-foreground">
          <p>
            Relatório gerado pelo RotaLucro em {formatDateTime(emittedAt)}. Valores
            em reais (BRL). A coluna &quot;Combustível rateado&quot; é a parte do
            abastecimento atribuída a cada corrida, proporcional aos KM rodados
            (ou dividida igualmente quando não há KM), calculada a partir dos
            registros em Abastecimentos.
          </p>
        </footer>
      </div>

      {loading && (
        <p className="no-print text-center text-sm text-muted-foreground">
          Carregando corridas...
        </p>
      )}
    </div>
  );
}
