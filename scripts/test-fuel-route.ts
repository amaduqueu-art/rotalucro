import assert from 'node:assert/strict';

import { allocateFuel, rideDistanceKm } from '../src/lib/fuel-allocation';
import {
  haversineKm,
  limitRoutePoints,
  parseStoredRoute,
  routeDistanceKm,
} from '../src/lib/route';
import type { FuelRefuel, Ride } from '../src/lib/supabase/types';

let failures = 0;

function check(name: string, fn: () => void) {
  try {
    fn();
    console.log(`OK   ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL ${name}`);
    console.error(' ', error instanceof Error ? error.message : error);
  }
}

const HOUR = 60 * 60 * 1000;
const base = new Date('2026-11-17T08:00:00-03:00').getTime();

function refuel(
  id: string,
  hoursFromBase: number,
  totalCost: number,
  quantity = 8,
): FuelRefuel {
  return {
    id,
    user_id: 'user-1',
    fueled_at: new Date(base + hoursFromBase * HOUR).toISOString(),
    fuel_type: 'gasolina',
    quantity,
    unit_price: totalCost / quantity,
    total_cost: totalCost,
    odometer: null,
    station: null,
    notes: null,
    created_at: new Date(base).toISOString(),
  };
}

function ride(
  id: string,
  hoursFromBase: number,
  fare: number,
  distance: number,
): Ride {
  const at = new Date(base + hoursFromBase * HOUR).toISOString();
  const kmFinal = 1000 + distance;

  return {
    id,
    user_id: 'user-1',
    ride_at: at,
    fare,
    fuel_cost: 0,
    extra_expenses: 0,
    km_initial: 1000,
    km_final: kmFinal,
    payment_method: 'dinheiro',
    payment_status: 'pago',
    paid_at: null,
    pix_txid: null,
    profit: fare,
    distance_km: distance,
    route: null,
    route_distance_km: null,
    route_started_at: null,
    route_ended_at: null,
    notes: null,
    created_at: at,
    updated_at: at,
  };
}

const money = (value: number) => Math.round(value * 100) / 100;

// ---------------------------------------------------------------------------
// Rateio de combustível
// ---------------------------------------------------------------------------

check('um abastecimento é dividido entre as corridas seguintes', () => {
  // Cenário relatado: R$ 50 abastecidos e várias corridas de R$ 10.
  // Nenhuma corrida pode absorver os R$ 50 inteiros.
  const refuels = [refuel('r1', 0, 50)];
  const rides = Array.from({ length: 5 }, (_, index) =>
    ride(`c${index}`, 1 + index, 10, 10),
  );

  const allocation = allocateFuel(refuels, rides);
  const costs = rides.map((item) => allocation.get(item.id)?.cost ?? 0);

  assert.deepEqual(costs, [10, 10, 10, 10, 10]);
  assert.equal(money(costs.reduce((sum, value) => sum + value, 0)), 50);

  // Lucro de cada corrida: 10 - 10 = 0, não -40.
  const profits = rides.map((item, index) =>
    money(item.fare - costs[index] - item.extra_expenses),
  );
  assert.deepEqual(profits, [0, 0, 0, 0, 0]);
});

check('a soma das parcelas preserva o custo total (sobra na última)', () => {
  const refuels = [refuel('r1', 0, 50, 7)];
  // Distâncias que não dividem 50 exatamente.
  const rides = [
    ride('c1', 1, 30, 7),
    ride('c2', 2, 30, 11),
    ride('c3', 3, 30, 13),
  ];

  const allocation = allocateFuel(refuels, rides);
  const costs = rides.map((item) => allocation.get(item.id)?.cost ?? 0);
  const quantities = rides.map((item) => allocation.get(item.id)?.quantity ?? 0);

  assert.equal(money(costs.reduce((sum, value) => sum + value, 0)), 50);
  assert.equal(money(quantities.reduce((sum, value) => sum + value, 0)), 7);
  assert.ok(costs.every((value) => value >= 0 && value <= 50));
});

check('cada abastecimento só paga as corridas até o próximo', () => {
  const refuels = [refuel('r1', 0, 30), refuel('r2', 10, 20)];
  const rides = [
    ride('c1', 1, 40, 10),
    ride('c2', 2, 40, 10),
    ride('c3', 11, 40, 10),
    ride('c4', 12, 40, 10),
  ];

  const allocation = allocateFuel(refuels, rides);
  const costs = rides.map((item) => allocation.get(item.id)?.cost ?? 0);

  assert.deepEqual(costs, [15, 15, 10, 10]);
  assert.equal(money(costs[0] + costs[1]), 30);
  assert.equal(money(costs[2] + costs[3]), 20);
});

check('rateio ponderado por KM; sem KM, partes iguais', () => {
  const refuels = [refuel('r1', 0, 60)];
  const withKm = [ride('a', 1, 50, 10), ride('b', 2, 50, 30)];
  const allocationKm = allocateFuel(refuels, withKm);

  assert.equal(allocationKm.get('a')?.cost, 15);
  assert.equal(allocationKm.get('b')?.cost, 45);

  const withoutKm = withKm.map((item) => ({ ...item, distance_km: null, km_final: null }));
  const allocationEqual = allocateFuel(refuels, withoutKm);
  assert.equal(allocationEqual.get('a')?.cost, 30);
  assert.equal(allocationEqual.get('b')?.cost, 30);
});

check('corrida fora da janela e lista vazia não recebem custo', () => {
  const refuels = [refuel('r1', 5, 40)];
  const before = ride('antes', 1, 20, 10);
  const after = ride('depois', 6, 20, 10);
  const allocation = allocateFuel(refuels, [before, after]);

  assert.equal(allocation.get('antes')?.cost, 0);
  assert.equal(allocation.get('depois')?.cost, 40);
  assert.equal(allocateFuel(refuels, []).size, 0);
});

check('rideDistanceKm usa a coluna gerada ou calcula KM final - inicial', () => {
  const item = ride('c1', 1, 20, 12);
  assert.equal(rideDistanceKm(item), 12);
  assert.equal(rideDistanceKm({ ...item, distance_km: null }), 12);
  assert.equal(rideDistanceKm({ ...item, distance_km: null, km_final: null }), 0);
});

// ---------------------------------------------------------------------------
// Rota e distância
// ---------------------------------------------------------------------------

check('distância de Haversine entre dois pontos conhecidos', () => {
  // ~111,19 km por grau de latitude no equador.
  const distance = haversineKm({ lat: 0, lng: 0 }, { lat: 1, lng: 0 });
  assert.ok(distance > 111 && distance < 112, `distância: ${distance}`);
});

check('routeDistanceKm soma segmentos e ignora saltos irreais', () => {
  const points = [
    { lat: -23.55, lng: -46.63 },
    { lat: -23.56, lng: -46.64 },
    { lat: -23.57, lng: -46.65 },
    // Salto de centenas de km: GPS ruim, deve ser descartado.
    { lat: -22, lng: -43 },
  ];

  const distance = routeDistanceKm(points);
  assert.ok(distance > 1 && distance < 10, `distância: ${distance}`);
  assert.equal(routeDistanceKm([]), 0);
  assert.equal(routeDistanceKm([points[0]]), 0);
});

check('parseStoredRoute aceita array, objeto e JSON em string', () => {
  const point = { lat: -23.5, lng: -46.6, at: '2026-11-17T12:00:00Z' };

  assert.deepEqual(parseStoredRoute([point]), [point]);
  assert.deepEqual(parseStoredRoute({ points: [point] }), [point]);
  assert.deepEqual(parseStoredRoute(JSON.stringify([point])), [point]);
  assert.deepEqual(parseStoredRoute('{invalido'), []);
  assert.deepEqual(
    parseStoredRoute([point, { lat: 'x', lng: 1 }, null]),
    [point],
  );
});

check('limitRoutePoints reduz pontos preservando início e fim', () => {
  const points = Array.from({ length: 1000 }, (_, index) => index);
  const limited = limitRoutePoints(points, 100);

  assert.ok(limited.length <= 101);
  assert.equal(limited[0], 0);
  assert.equal(limited[limited.length - 1], 999);
  assert.equal(limitRoutePoints([1, 2], 500).length, 2);
});

console.log(failures > 0 ? `\n${failures} caso(s) falharam.` : '\nTodos os casos passaram.');
process.exit(failures > 0 ? 1 : 0);
