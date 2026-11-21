import type { PixKeyType } from '@/lib/supabase/types';

/**
 * Geração do "PIX Copia e Cola" (BR Code / EMV).
 *
 * A chave NÃO fica no código: cada motorista cadastra a sua em Configurações
 * (`driver_profiles`). O QR Code é estático: carrega a chave do motorista, o
 * valor e um identificador da corrida. Bancos não avisam este app quando o PIX
 * cai — por isso o motorista confirma o recebimento (ver PixQrDialog). Para
 * confirmação automática é necessário integrar um PSP com webhook.
 */

/** Remove acentos, caracteres especiais e limita o tamanho. */
function sanitize(value: string, maxLength: number): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9 .,-]/g, '')
    .trim()
    .slice(0, maxLength);
}

/** Monta um campo EMV: ID + tamanho (2 dígitos) + valor. */
function field(id: string, value: string): string {
  return `${id}${String(value.length).padStart(2, '0')}${value}`;
}

/** CRC16-CCITT-FALSE, exigido pelo padrão BR Code. */
export function crc16(payload: string): string {
  let crc = 0xffff;

  for (let index = 0; index < payload.length; index += 1) {
    crc ^= payload.charCodeAt(index) << 8;

    for (let bit = 0; bit < 8; bit += 1) {
      crc =
        crc & 0x8000
          ? ((crc << 1) ^ 0x1021) & 0xffff
          : (crc << 1) & 0xffff;
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/** Identificador curto e único para o campo txid do PIX. */
export function createPixTxid(seed = ''): string {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;

  return `${random}${seed}`
    .replace(/[^A-Za-z0-9]/g, '')
    .slice(0, 25)
    .toUpperCase();
}

/**
 * Normaliza a chave conforme o tipo antes de gravá-la no BR Code.
 * CPF/CNPJ/TELEFONE usam somente dígitos; telefone ganha o prefixo 55;
 * e-mail é minúsculo e sem espaços; aleatória é mantida exatamente como
 * cadastrada (ela pode conter hífens e letras).
 */
export function normalizePixKey(key: string, keyType: PixKeyType): string {
  const value = key.trim();

  switch (keyType) {
    case 'CPF':
    case 'CNPJ':
      return value.replace(/\D/g, '');
    case 'TELEFONE': {
      const digits = value.replace(/\D/g, '').replace(/^0+/, '');
      return digits.length === 11 ? `55${digits}` : digits;
    }
    case 'EMAIL':
      return value.replace(/\s+/g, '').toLowerCase();
    case 'ALEATORIA':
      return value;
    default:
      return value;
  }
}

/** Chave legível para exibição na tela (máscara de CPF/CNPJ/telefone). */
export function formatPixKey(
  key: string,
  keyType: PixKeyType = 'CPF',
): string {
  const value = key.trim();
  const digits = value.replace(/\D/g, '');

  if (keyType === 'CPF' && digits.length === 11) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(
      6,
      9,
    )}-${digits.slice(9)}`;
  }

  if (keyType === 'CNPJ' && digits.length === 14) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(
      5,
      8,
    )}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  }

  if (keyType === 'TELEFONE') {
    const local =
      digits.length === 13 && digits.startsWith('55')
        ? digits.slice(2)
        : digits;

    if (local.length === 11) {
      return `+55 (${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
    }
    if (local.length === 10) {
      return `+55 (${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
    }
  }

  return value;
}

export interface PixPayloadInput {
  amount: number;
  txid: string;
  /** Chave do motorista logado (vem de driver_profiles). */
  key: string;
  keyType: PixKeyType;
  merchantName: string;
  merchantCity: string;
}

/** Gera o payload "copia e cola" do PIX estático. */
export function buildPixPayload({
  amount,
  txid,
  key,
  keyType,
  merchantName,
  merchantCity,
}: PixPayloadInput): string {
  const safeKey = normalizePixKey(key, keyType);

  if (!safeKey) {
    throw new Error('Cadastre sua chave PIX em Configurações antes de cobrar.');
  }

  const safeTxid = txid.replace(/[^A-Za-z0-9]/g, '').slice(0, 25) || '***';
  const safeAmount = Math.max(amount, 0).toFixed(2);

  const merchantAccount =
    field('00', 'br.gov.bcb.pix') + field('01', safeKey);

  const payload =
    field('00', '01') +
    field('26', merchantAccount) +
    field('52', '0000') +
    field('53', '986') +
    field('54', safeAmount) +
    field('58', 'BR') +
    field('59', sanitize(merchantName, 25).toUpperCase() || 'RECEBEDOR') +
    field('60', sanitize(merchantCity, 15).toUpperCase() || 'BRASIL') +
    field('62', field('05', safeTxid)) +
    '6304';

  return `${payload}${crc16(payload)}`;
}
