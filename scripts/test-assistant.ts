import assert from 'node:assert/strict';

import {
  buildAssistantReply,
  parseAssistantIntent,
  summarizeRefuels,
  summarizeRides,
  toSpeechText,
  type AssistantIntent,
} from '../src/lib/assistant';
import type { FuelRefuel, Ride } from '../src/lib/supabase/types';

const cases: Array<[string, AssistantIntent]> = [
  [
    'quanto lucrei hoje',
    { kind: 'summary', period: 'today', metric: 'profit' },
  ],
  [
    'quanto faturei este mês',
    { kind: 'summary', period: 'month', metric: 'revenue' },
  ],
  [
    'quanto gastei de gasolina essa semana',
    { kind: 'summary', period: 'week', metric: 'fuel' },
  ],
  [
    'quantos km rodei',
    { kind: 'summary', period: 'today', metric: 'distance' },
  ],
  [
    'quantas corridas fiz no total',
    { kind: 'summary', period: 'all', metric: 'count' },
  ],
  [
    'qual meu lucro por km',
    { kind: 'summary', period: 'today', metric: 'profitPerKm' },
  ],
  ['registrar corrida de 25 reais', { kind: 'register', fare: 25 }],
  [
    'nova corrida de vinte e cinco reais e cinquenta centavos',
    { kind: 'register', fare: 25.5 },
  ],
  ['corrida 85', { kind: 'register', fare: 85 }],
  ['abrir histórico', { kind: 'navigate', target: 'history' }],
  ['me ajuda', { kind: 'help' }],
  ['bom dia', { kind: 'greeting' }],
  [
    'resumo do mês',
    { kind: 'summary', period: 'month', metric: 'overview' },
  ],
  ['quanto lucrei', { kind: 'summary', period: 'today', metric: 'profit' }],
  ['pix', { kind: 'pix' }],
  [
    'quanto lucrei de pix',
    { kind: 'summary', period: 'today', metric: 'profit' },
  ],
  [
    'corrida de ontem',
    { kind: 'summary', period: 'yesterday', metric: 'count' },
  ],
  [
    'quanto rendeu por km',
    { kind: 'summary', period: 'today', metric: 'profitPerKm' },
  ],
  [
    'gastos do mês',
    { kind: 'summary', period: 'month', metric: 'expenses' },
  ],
];

let failures = 0;

for (const [input, expected] of cases) {
  const actual = parseAssistantIntent(input);

  try {
    assert.deepEqual(actual, expected);
    console.log(`OK   "${input}"`);
  } catch {
    failures += 1;
    console.error(`FAIL "${input}"`);
    console.error('  esperado:', JSON.stringify(expected));
    console.error('  recebido:', JSON.stringify(actual));
  }
}

const today = new Date();
today.setHours(10, 0, 0, 0);

const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);

const old = new Date(today);
old.setDate(old.getDate() - 40);

function ride(
  id: string,
  date: Date,
  fare: number,
  fuel: number,
  extras: number,
  distance: number,
): Ride {
  return {
    id,
    user_id: 'user-1',
    ride_at: date.toISOString(),
    fare,
    // Combustível já rateado: o valor informado aqui é a parcela da corrida.
    fuel_cost: fuel,
    extra_expenses: extras,
    km_initial: 1000,
    km_final: 1000 + distance,
    payment_method: 'dinheiro',
    payment_status: 'pago',
    paid_at: null,
    pix_txid: null,
    profit: fare - fuel - extras,
    distance_km: distance,
    route: null,
    route_distance_km: null,
    route_started_at: null,
    route_ended_at: null,
    notes: null,
    created_at: date.toISOString(),
    updated_at: date.toISOString(),
  };
}

const rides: Ride[] = [
  ride('1', today, 100, 20, 5, 40),
  ride('2', today, 50, 10, 0, 20),
  ride('3', yesterday, 30, 0, 0, 10),
  ride('4', old, 200, 50, 0, 100),
];

const todaySummary = summarizeRides(rides, 'today');
assert.equal(todaySummary.count, 2);
assert.equal(todaySummary.revenue, 150);
assert.equal(todaySummary.fuel, 30);
assert.equal(todaySummary.extras, 5);
assert.equal(todaySummary.expenses, 35);
assert.equal(todaySummary.profit, 115);
assert.equal(todaySummary.distance, 60);
assert.equal(todaySummary.profitPerKm, 1.92);

const allSummary = summarizeRides(rides, 'all');
assert.equal(allSummary.count, 4);
assert.equal(allSummary.revenue, 380);
assert.equal(allSummary.profit, 295);

const overview = buildAssistantReply(
  { kind: 'summary', period: 'today', metric: 'overview' },
  rides,
);
assert.match(overview.reply, /Hoje/);
assert.match(overview.reply, /R\$\s*115,00/);
assert.match(overview.reply, /60 km/);

const profitReply = buildAssistantReply(
  { kind: 'summary', period: 'today', metric: 'profit' },
  rides,
);
assert.match(profitReply.reply, /R\$\s*115,00/);

const registerReply = buildAssistantReply(
  { kind: 'register', fare: 25 },
  rides,
);
assert.deepEqual(registerReply.action, { type: 'register', fare: 25 });

const emptyReply = buildAssistantReply(
  { kind: 'summary', period: 'today', metric: 'overview' },
  [],
);
assert.match(emptyReply.reply, /Não encontrei corridas hoje/);

const loadingReply = buildAssistantReply(
  { kind: 'summary', period: 'today', metric: 'profit' },
  null,
);
assert.match(loadingReply.reply, /carregando/);

assert.equal(
  toSpeechText('Seu lucro foi R$ 1.250,50 em 3 km.'),
  'Seu lucro foi 1250 reais e 50 centavos em 3 quilômetros.',
);
assert.equal(
  toSpeechText('O total ficou em R$ 0,50.'),
  'O total ficou em 50 centavos.',
);

// Abastecimentos são eventos separados das corridas.
const refuels: FuelRefuel[] = [
  {
    id: 'f1',
    user_id: 'user-1',
    fueled_at: today.toISOString(),
    fuel_type: 'gasolina',
    quantity: 8,
    unit_price: 6.25,
    total_cost: 50,
    odometer: null,
    station: null,
    notes: null,
    created_at: today.toISOString(),
  },
];

const todayRefuels = summarizeRefuels(refuels, 'today');
assert.equal(todayRefuels.count, 1);
assert.equal(todayRefuels.total, 50);
assert.equal(summarizeRefuels(refuels, 'yesterday').count, 0);

const fuelReply = buildAssistantReply(
  { kind: 'summary', period: 'today', metric: 'fuel' },
  rides,
  refuels,
);
assert.match(fuelReply.reply, /abasteceu R\$\s*50,00/);
assert.match(fuelReply.reply, /rateados/);

// Mesmo sem corrida no período, o gasto na bomba continua aparecendo.
const noRidesFuelReply = buildAssistantReply(
  { kind: 'summary', period: 'today', metric: 'fuel' },
  [],
  refuels,
);
assert.match(noRidesFuelReply.reply, /abasteceu R\$\s*50,00/);

console.log('\nRespostas de exemplo:');
console.log('-', overview.reply);
console.log('-', profitReply.reply);
console.log('-', registerReply.reply);
console.log('-', emptyReply.reply);

if (failures > 0) {
  console.error(`\n${failures} caso(s) falharam.`);
  process.exit(1);
}

console.log('\nTodos os casos passaram.');
