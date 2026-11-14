/**
 * Identidade do aplicativo.
 *
 * Para trocar o nome, o dono ou a chave PIX, altere somente este arquivo.
 * O restante do app (cabeçalho, metadados, QR Code e rodapé) lê daqui.
 */
export const BRAND = {
  /** Nome curto usado no cabeçalho, título das páginas e PWA. */
  name: 'RotaRendaComLucro',
  /** Nome comercial por extenso. */
  fullName: 'Rota da Renda com Lucro',
  /** Nome compacto usado onde o espaço é curto. */
  shortName: 'RotaRenda',
  tagline: 'Cada corrida, mais lucro no seu bolso.',
  owner: 'Maduqueu Antônio',
  year: 2026,

  /**
   * Chave PIX do recebedor (somente o número do CPF, sem pontos).
   * O QR Code é estático: o app exibe e o motorista confirma o recebimento.
   */
  pix: {
    key: '82191999468',
    keyType: 'CPF',
    /** Nome exibido no comprovante PIX (máx. 25 caracteres, sem acentos). */
    merchantName: 'MADUQUEU ANTONIO',
    /** Cidade do recebedor (máx. 15 caracteres, sem acentos). */
    merchantCity: 'BRASIL',
  },
} as const;

/** CPF com máscara para exibição: 821.919.994-68. */
export function formatPixKey(key: string = BRAND.pix.key): string {
  const digits = key.replace(/\D/g, '').slice(0, 11);
  if (digits.length !== 11) return key;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(
    6,
    9,
  )}-${digits.slice(9)}`;
}
