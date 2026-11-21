/**
 * Identidade fixa do aplicativo.
 *
 * A chave PIX NÃO fica mais aqui: cada motorista cadastra a sua no app, em
 * Configurações, e ela é salva por usuário na tabela `driver_profiles`.
 * Este arquivo guarda apenas nome, autor e ano (usados no cabeçalho,
 * metadados e PWA).
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
} as const;
