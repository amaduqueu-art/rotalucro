import { formatBRL } from '@/lib/format';
import { LIMITS } from '@/lib/constants';
import type { Ride } from '@/lib/supabase/types';
import { extractSpokenAmount } from '@/lib/speech';

/** Períodos aceitos nos comandos de consulta. */
export type AssistantPeriod = 'today' | 'yesterday' | 'week' | 'month' | 'all';

/** Indicador financeiro pedido pelo motorista. */
export type AssistantMetric =
  | 'overview'
  | 'profit'
  | 'revenue'
  | 'expenses'
  | 'fuel'
  | 'distance'
  | 'count'
  | 'profitPerKm';

export type AssistantIntent =
  | { kind: 'summary'; period: AssistantPeriod; metric: AssistantMetric }
  | { kind: 'register'; fare: number | null }
  | { kind: 'navigate'; target: 'home' | 'history' }
  | { kind: 'pix' }
  | { kind: 'help' }
  | { kind: 'greeting' }
  | { kind: 'unknown' };

export type AssistantAction =
  | { type: 'navigate'; href: string }
  | { type: 'register'; fare: number | null };

export interface AssistantReply {
  reply: string;
  action?: AssistantAction;
}

export interface AssistantSummary {
  count: number;
  revenue: number;
  fuel: number;
  extras: number;
  expenses: number;
  profit: number;
  distance: number;
  profitPerKm: number | null;
}

const HELP_TEXT =
  'Você pode perguntar "quanto lucrei hoje", "quanto gastei este mês", "quantos km rodei" ou "qual meu lucro por km". Também pode dizer "registrar corrida de 25 reais" ou "abrir histórico".';

/**
 * Interpreta uma frase falada/digitada em português e devolve a intenção.
 * A função é pura: não acessa rede, banco nem estado do React.
 */
export function parseAssistantIntent(raw: string): AssistantIntent {
  const text = normalizeText(raw);
  if (!text) return { kind: 'unknown' };

  if (/\b(ajuda|comandos|o que voce (faz|pode)|como funciona)\b/.test(text)) {
    return { kind: 'help' };
  }

  if (
    /^(oi|ola|opa|bom dia|boa tarde|boa noite|e ai)\b/.test(text) &&
    text.split(' ').length <= 5
  ) {
    return { kind: 'greeting' };
  }

  const asksQuestion =
    /\b(quanto|quantos|quantas|qual|quais|resumo|total|media|saldo|lucrei|lucre|lucrou|faturei|fature|gastei|gaste|gastou|rodei|rode|ganhei|ganhou)\b/.test(
      text,
    );

  const amount = extractSpokenAmount(raw);
  const fare = amount !== null && amount > 0 ? amount : null;

  // "corrida de ontem" é consulta; "corrida de 25" é registro.
  if (
    /^corrida\b/.test(text) &&
    fare === null &&
    /\b(ontem|hoje|semana|mes|total)\b/.test(text)
  ) {
    return {
      kind: 'summary',
      period: parsePeriod(text),
      metric: 'count',
    };
  }

  if (hasRegisterCommand(text) && !asksQuestion) {
    return { kind: 'register', fare };
  }

  const navigation = parseNavigation(text);
  if (navigation) return navigation;

  if (asksQuestion || hasMetricWord(text)) {
    return {
      kind: 'summary',
      period: parsePeriod(text),
      metric: parseMetric(text),
    };
  }

  if (/\bpix\b/.test(text)) {
    return { kind: 'pix' };
  }

  if (hasRegisterCommand(text)) {
    return { kind: 'register', fare };
  }

  return { kind: 'unknown' };
}

/**
 * Monta a resposta em texto e, quando fizer sentido, a ação de navegação.
 * `rides` pode ser null enquanto os dados ainda estão carregando.
 */
export function buildAssistantReply(
  intent: AssistantIntent,
  rides: Ride[] | null,
): AssistantReply {
  switch (intent.kind) {
    case 'help':
      return { reply: HELP_TEXT };

    case 'greeting':
      return {
        reply:
          'Olá! Sou o assistente do RotaRenda. Pergunte sobre lucro, despesas ou quilômetros, ou diga "registrar corrida de 25 reais".',
      };

    case 'pix':
      return {
        reply:
          'Para receber por PIX, abra o histórico, escolha a corrida e toque em "Cobrar PIX". Eu ainda não consigo gerar a cobrança sozinho.',
      };

    case 'navigate':
      return intent.target === 'history'
        ? {
            reply: 'Abrindo o histórico de corridas.',
            action: { type: 'navigate', href: '/historico' },
          }
        : {
            reply: 'Voltando para o painel.',
            action: { type: 'navigate', href: '/' },
          };

    case 'register':
      if (intent.fare === null) {
        return {
          reply: 'Abrindo o formulário de nova corrida.',
          action: { type: 'register', fare: null },
        };
      }

      if (intent.fare > LIMITS.fareMax) {
        return {
          reply:
            'Esse valor parece alto demais. Vou abrir o formulário para você conferir.',
          action: { type: 'register', fare: null },
        };
      }

      return {
        reply: `Abrindo o formulário com o valor de ${formatBRL(
          intent.fare,
        )}. Confira o combustível e a quilometragem antes de salvar.`,
        action: { type: 'register', fare: intent.fare },
      };

    case 'summary': {
      if (!rides) {
        return {
          reply:
            'Ainda estou carregando suas corridas. Tente novamente em alguns segundos.',
        };
      }

      return {
        reply: buildSummaryReply(
          summarizeRides(rides, intent.period),
          intent.period,
          intent.metric,
        ),
      };
    }

    default:
      return {
        reply:
          'Não entendi. Tente "quanto lucrei hoje", "quanto gastei este mês" ou "registrar corrida de 25 reais".',
      };
  }
}

/** Atalho usado pelo componente: interpreta e responde em uma chamada. */
export function runAssistantCommand(
  raw: string,
  rides: Ride[] | null,
): AssistantReply {
  return buildAssistantReply(parseAssistantIntent(raw), rides);
}

/** Resume as corridas do período informado. */
export function summarizeRides(
  rides: Ride[],
  period: AssistantPeriod,
): AssistantSummary {
  const { start, end } = periodRange(period);

  const selected = rides.filter((ride) => {
    const time = new Date(ride.ride_at).getTime();
    return Number.isFinite(time) && time >= start && time < end;
  });

  let revenue = 0;
  let fuel = 0;
  let extras = 0;
  let profit = 0;
  let distance = 0;

  for (const ride of selected) {
    revenue += numberOrZero(ride.fare);
    fuel += numberOrZero(ride.fuel_cost);
    extras += numberOrZero(ride.extra_expenses);
    profit += numberOrZero(ride.profit);

    const rideDistance =
      ride.distance_km ??
      (ride.km_final !== null ? ride.km_final - ride.km_initial : 0);

    if (Number.isFinite(rideDistance) && rideDistance > 0) {
      distance += rideDistance;
    }
  }

  const expenses = fuel + extras;
  const profitPerKm = distance > 0 ? round(profit / distance, 2) : null;

  return {
    count: selected.length,
    revenue: round(revenue, 2),
    fuel: round(fuel, 2),
    extras: round(extras, 2),
    expenses: round(expenses, 2),
    profit: round(profit, 2),
    distance: round(distance, 1),
    profitPerKm,
  };
}

/**
 * Converte o texto exibido em algo mais natural para a voz do sistema:
 * "R$ 120,50" vira "120 reais e 50 centavos"; "km" vira "quilômetros".
 */
export function toSpeechText(text: string): string {
  return text
    .replace(/R\$\s*([\d.]+),(\d{2})/g, (_, integer: string, cents: string) => {
      const whole = Number(integer.replace(/\./g, ''));
      const centavos = Number(cents);

      if (whole === 0 && centavos > 0) {
        return `${centavos} ${centavos === 1 ? 'centavo' : 'centavos'}`;
      }

      const reais = whole === 1 ? '1 real' : `${whole} reais`;

      if (centavos === 0) return reais;
      return `${reais} e ${centavos} ${
        centavos === 1 ? 'centavo' : 'centavos'
      }`;
    })
    .replace(/\/km\b/g, ' por quilômetro')
    .replace(/\bkm\b/g, 'quilômetros');
}

function buildSummaryReply(
  summary: AssistantSummary,
  period: AssistantPeriod,
  metric: AssistantMetric,
): string {
  const lead = periodLead(period);
  const label = periodLabel(period);
  const ridesLabel = plural(summary.count, 'corrida', 'corridas');

  if (summary.count === 0) {
    return `Não encontrei corridas ${label}. Você pode registrar uma agora pelo formulário ou dizendo "registrar corrida de 25 reais".`;
  }

  switch (metric) {
    case 'profit':
      return summary.profit < 0
        ? `${lead}, você teve prejuízo de ${formatBRL(
            Math.abs(summary.profit),
          )} em ${ridesLabel}.`
        : `${lead}, seu lucro líquido foi de ${formatBRL(
            summary.profit,
          )} em ${ridesLabel}.`;

    case 'revenue':
      return `${lead}, seu faturamento foi de ${formatBRL(
        summary.revenue,
      )} em ${ridesLabel}.`;

    case 'expenses':
      return `${lead}, você teve ${formatBRL(
        summary.expenses,
      )} de despesas: ${formatBRL(summary.fuel)} de combustível e ${formatBRL(
        summary.extras,
      )} de extras.`;

    case 'fuel':
      return summary.fuel === 0
        ? `${lead}, não há gasto de combustível registrado.`
        : `${lead}, você gastou ${formatBRL(
            summary.fuel,
          )} com combustível em ${ridesLabel}.`;

    case 'distance':
      return summary.distance === 0
        ? `${lead}, não há quilometragem registrada nas corridas.`
        : `${lead}, você rodou ${formatKm(summary.distance)} em ${ridesLabel}.`;

    case 'count':
      return `${lead}, você registrou ${ridesLabel}.`;

    case 'profitPerKm':
      if (summary.profitPerKm === null) {
        return `${lead}, ainda não há quilometragem suficiente para calcular o lucro por quilômetro.`;
      }

      return summary.profitPerKm < 0
        ? `${lead}, você teve prejuízo médio de ${formatBRL(
            Math.abs(summary.profitPerKm),
          )} por quilômetro.`
        : `${lead}, seu lucro médio foi de ${formatBRL(
            summary.profitPerKm,
          )} por quilômetro.`;

    case 'overview':
    default: {
      const profitText =
        summary.profit < 0
          ? `teve prejuízo de ${formatBRL(Math.abs(summary.profit))}`
          : `lucrou ${formatBRL(summary.profit)}`;

      const distanceText =
        summary.distance > 0
          ? ` Você rodou ${formatKm(summary.distance)}`
          : '';

      const perKmText =
        summary.profitPerKm !== null && summary.distance > 0
          ? `, com ${formatBRL(
              Math.abs(summary.profitPerKm),
            )} de ${summary.profitPerKm < 0 ? 'prejuízo' : 'lucro'} por quilômetro.`
          : '.';

      return `${lead}, você fez ${ridesLabel}, faturou ${formatBRL(
        summary.revenue,
      )}, gastou ${formatBRL(summary.expenses)} e ${profitText}.${distanceText}${perKmText}`;
    }
  }
}

function parseNavigation(text: string): AssistantIntent | null {
  const wantsNavigation =
    /\b(abrir|abre|ir|vai|ver|mostrar|mostra|voltar|volta)\b/.test(text);

  if (/\b(historico|extrato|lista de corridas)\b/.test(text)) {
    if (wantsNavigation || /^(historico|extrato)$/.test(text)) {
      return { kind: 'navigate', target: 'history' };
    }
  }

  if (/\b(painel|inicio|home|tela principal)\b/.test(text)) {
    if (wantsNavigation || /^(painel|inicio|home)$/.test(text)) {
      return { kind: 'navigate', target: 'home' };
    }
  }

  return null;
}

function hasRegisterCommand(text: string): boolean {
  if (
    /\b(registrar|registra|registre|anotar|anota|anote|lancar|lanca|lance|adicionar|adiciona|adicionar corrida|nova corrida|novo registro)\b/.test(
      text,
    )
  ) {
    return true;
  }

  return /^corrida\b/.test(text);
}

function hasMetricWord(text: string): boolean {
  return /\b(lucro|lucrei|lucrou|faturamento|faturei|receita|despesa|despesas|gastei|gasto|gastos|combustivel|gasolina|alcool|gnv|abastecimento|abasteci|quilometro|quilometros|rodou|rodei|corridas|viagens|rendimento|rendeu)\b/.test(
    text,
  );
}

function parsePeriod(text: string): AssistantPeriod {
  if (/\bontem\b/.test(text)) return 'yesterday';
  if (/\b(semana|semanal|7 dias|sete dias)\b/.test(text)) return 'week';
  if (/\b(mes|mensal|30 dias|trinta dias)\b/.test(text)) return 'month';
  if (/\b(tudo|total|geral|sempre|desde o inicio)\b/.test(text)) return 'all';
  return 'today';
}

function parseMetric(text: string): AssistantMetric {
  if (
    /(lucro|rendimento|rendeu|rende|ganho|resultado).*(por|pelo) (km|quilometro)|(por|pelo) (km|quilometro).*(lucro|rendimento|ganho|resultado)|media por km/.test(
      text,
    )
  ) {
    return 'profitPerKm';
  }

  if (/\b(combustivel|gasolina|alcool|gnv|abastecimento|abasteci)\b/.test(text)) {
    return 'fuel';
  }

  if (/\b(lucro|lucrei|lucrou|sobra|resultado)\b/.test(text)) {
    return 'profit';
  }

  if (/\b(faturamento|faturei|faturou|receita|entrada|ganhei|ganhou)\b/.test(text)) {
    return 'revenue';
  }

  if (/\b(despesa|despesas|gastei|gaste|gastou|gasto|gastos|custo|custos)\b/.test(text)) {
    return 'expenses';
  }

  if (
    /\b(km|quilometro|quilometros|rodou|rodei|rodados|distancia)\b/.test(text)
  ) {
    return 'distance';
  }

  if (/\b(quantas corridas|corridas|viagens|atendimentos)\b/.test(text)) {
    return 'count';
  }

  return 'overview';
}

function periodRange(period: AssistantPeriod): { start: number; end: number } {
  const now = new Date();

  if (period === 'all') {
    return { start: Number.NEGATIVE_INFINITY, end: Number.POSITIVE_INFINITY };
  }

  if (period === 'yesterday') {
    const start = new Date(now);
    start.setDate(start.getDate() - 1);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    return { start: start.getTime(), end: end.getTime() };
  }

  if (period === 'week') {
    const start = new Date(now);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);

    const end = new Date(now);
    end.setDate(end.getDate() + 1);
    end.setHours(0, 0, 0, 0);

    return { start: start.getTime(), end: end.getTime() };
  }

  if (period === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);

    const end = new Date(now);
    end.setDate(end.getDate() + 1);
    end.setHours(0, 0, 0, 0);

    return { start: start.getTime(), end: end.getTime() };
  }

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start: start.getTime(), end: end.getTime() };
}

function periodLead(period: AssistantPeriod): string {
  switch (period) {
    case 'yesterday':
      return 'Ontem';
    case 'week':
      return 'Nos últimos 7 dias';
    case 'month':
      return 'Neste mês';
    case 'all':
      return 'No total';
    default:
      return 'Hoje';
  }
}

function periodLabel(period: AssistantPeriod): string {
  switch (period) {
    case 'yesterday':
      return 'ontem';
    case 'week':
      return 'nos últimos 7 dias';
    case 'month':
      return 'neste mês';
    case 'all':
      return 'no total';
    default:
      return 'hoje';
  }
}

function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

function formatKm(value: number): string {
  return `${new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 1,
  }).format(value)} km`;
}

function numberOrZero(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function normalizeText(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
