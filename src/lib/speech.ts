import { round } from '@/lib/calc';

/**
 * Interpreta valores ditados em português brasileiro.
 *
 * Exemplos aceitos:
 *   "85"                          -> 85
 *   "85,50"                       -> 85.5
 *   "oitenta e cinco reais"       -> 85
 *   "cento e vinte reais e 50 centavos" -> 120.5
 *   "mil duzentos e cinquenta reais"    -> 1250
 */
export function parseSpokenAmount(raw: string): number | null {
  const text = normalize(raw);
  if (!text) return null;

  const realMatch = text.match(/\b(real|reais|conto|contos)\b/);
  const centsMatch = text.match(/\bcentavos?\b/);

  // Caso com a moeda falada: "cento e vinte reais e 50 centavos".
  if (realMatch && realMatch.index !== undefined) {
    const before = text.slice(0, realMatch.index);
    const afterStart = realMatch.index + realMatch[0].length;
    const after =
      centsMatch && centsMatch.index !== undefined && centsMatch.index > afterStart
        ? text.slice(afterStart, centsMatch.index)
        : text.slice(afterStart);

    const isConto = realMatch[0].startsWith('conto');
    const reais = (parseAmountPart(before) ?? 0) * (isConto ? 1000 : 1);
    const centavos = parseCents(after) ?? 0;

    const total = round(reais + centavos / 100, 2);
    return total > 0 ? total : null;
  }

  // Só centavos: "cinquenta centavos".
  if (centsMatch && centsMatch.index !== undefined) {
    const centavos = parseAmountPart(text.slice(0, centsMatch.index)) ?? 0;
    const total = round(centavos / 100, 2);
    return total > 0 ? total : null;
  }

  const total = parseAmountPart(text);
  return total !== null && total > 0 ? round(total, 2) : null;
}

/** Lê "120", "120,50", "1.200,50" ou "cento e vinte". */
function parseAmountPart(part: string): number | null {
  const cleaned = part.trim();
  if (!cleaned) return null;

  // Ponto como separador de milhar (1.200) e vírgula como decimal.
  const normalized = cleaned
    .replace(/\.(?=\d{3}\b)/g, '')
    .replace(/,/g, '.');

  const numeric = normalized.match(/\d+(?:\.\d{1,2})?/);
  if (numeric) {
    const value = Number(numeric[0]);
    return Number.isFinite(value) ? value : null;
  }

  return wordsToNumber(normalized.split(/\s+/).filter(Boolean));
}

/** Lê a parte dos centavos, ignorando o "e" de ligação. */
function parseCents(part: string): number | null {
  const cleaned = part.replace(/\be\b/g, ' ').trim();
  if (!cleaned) return null;
  const value = parseAmountPart(cleaned);
  return value !== null && value >= 0 && value < 100 ? value : null;
}

const UNITS: Record<string, number> = {
  zero: 0,
  um: 1,
  uma: 1,
  dois: 2,
  duas: 2,
  tres: 3,
  quatro: 4,
  cinco: 5,
  seis: 6,
  sete: 7,
  oito: 8,
  nove: 9,
  dez: 10,
  onze: 11,
  doze: 12,
  treze: 13,
  quatorze: 14,
  catorze: 14,
  quinze: 15,
  dezesseis: 16,
  dezessete: 17,
  dezoito: 18,
  dezenove: 19,
};

const TENS: Record<string, number> = {
  vinte: 20,
  trinta: 30,
  quarenta: 40,
  cinquenta: 50,
  sessenta: 60,
  setenta: 70,
  oitenta: 80,
  noventa: 90,
};

const HUNDREDS: Record<string, number> = {
  cem: 100,
  cento: 100,
  duzentos: 200,
  duzentas: 200,
  trezentos: 300,
  trezentas: 300,
  quatrocentos: 400,
  quatrocentas: 400,
  quinhentos: 500,
  quinhentas: 500,
  seiscentos: 600,
  seiscentas: 600,
  setecentos: 700,
  setecentas: 700,
  oitocentos: 800,
  oitocentas: 800,
  novecentos: 900,
  novecentas: 900,
};

const THOUSANDS = new Set(['mil']);
const MILLIONS = new Set(['milhao', 'milhoes']);

/** Converte palavras em número (0 a 999.999.999). */
export function wordsToNumber(words: string[]): number | null {
  const tokens = words.filter((word) => word !== 'e' && word !== 'de');
  if (tokens.length === 0) return null;

  let total = 0;
  let current = 0;

  for (const token of tokens) {
    if (token in UNITS) {
      current += UNITS[token];
      continue;
    }

    if (token in TENS) {
      current += TENS[token];
      continue;
    }

    if (token in HUNDREDS) {
      current += HUNDREDS[token];
      continue;
    }

    if (THOUSANDS.has(token)) {
      total += (current || 1) * 1000;
      current = 0;
      continue;
    }

    if (MILLIONS.has(token)) {
      total += (current || 1) * 1_000_000;
      current = 0;
      continue;
    }

    // Palavra desconhecida: melhor pedir para repetir do que gravar errado.
    return null;
  }

  return total + current;
}

function normalize(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/virgula/g, ',')
    .replace(/\bponto\b/g, ',')
    .replace(/[^a-z0-9,.\s]/g, ' ')
    .replace(/\s*,\s*/g, ',')
    .replace(/\s+/g, ' ')
    .trim();
}
