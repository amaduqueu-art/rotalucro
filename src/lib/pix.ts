import { BRAND } from '@/lib/brand';

/**
 * Geração do "PIX Copia e Cola" (BR Code / EMV).
 *
 * O QR Code é ESTÁTICO: ele carrega a chave, o valor e um identificador da
 * corrida. Bancos não avisam este app quando o PIX cai — por isso o motorista
 * confirma o recebimento na tela (ver PixQrDialog). Para confirmação automática
 * é necessário integrar um PSP (Mercado Pago, Asaas, Efí...) com webhook.
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

export interface PixPayloadInput {
  amount: number;
  txid: string;
  key?: string;
  merchantName?: string;
  merchantCity?: string;
}

/** Gera o payload "copia e cola" do PIX estático. */
export function buildPixPayload({
  amount,
  txid,
  key = BRAND.pix.key,
  merchantName = BRAND.pix.merchantName,
  merchantCity = BRAND.pix.merchantCity,
}: PixPayloadInput): string {
  const safeKey = key.replace(/\D/g, '') || key;
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
