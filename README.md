# RotaRendaComLucro 🚕💰

> Gestão financeira de corridas de táxi, por **Maduqueu Antônio**.
> Repositório: https://github.com/amaduqueu-art/rotalucro

Registre a corrida **falando o valor**, deixe o app calcular o combustível e o
**lucro líquido**, cobre por **PIX com QR Code** e acompanhe faturamento,
despesas e quilômetros rodados. Feito para quem vive no volante — inclusive
rodando à noite, com **tema escuro**.

Arquitetura **mobile-first**, login por e-mail e senha (com confirmação de
e-mail) e dados protegidos por **Row Level Security**: cada motorista vê apenas
as próprias corridas.

---

## O que mudou nesta versão (2.0)

| Área | Novidade |
| --- | --- |
| Marca | Nome personalizado **RotaRendaComLucro**, assinatura de **Maduqueu Antônio** |
| Combustível | **GNV, Álcool e Gasolina** |
| Custo do combustível | Calculado automaticamente: **quantidade × preço do litro/m³** |
| Entrada por voz | Botão de microfone ao lado do valor (Web Speech API, pt-BR) |
| Pagamento | Campo **Dinheiro, Cartão, PIX ou Aplicativo** |
| PIX | Após salvar, o app pergunta se deve gerar o **QR Code PIX** (CPF `821.919.994-68`) |
| Confirmação | Botão **“Já recebi o pagamento”** grava o pagamento e mostra a mensagem de confirmação |
| Despesas | Novo campo **Outras despesas** (pedágio, lavagem, lanche...) |
| Lucro | **Lucro líquido = valor da corrida − combustível − outras despesas** |
| Rendimento | **R$ / KM rodado** e **consumo km/L (ou km/m³)** |
| Dashboard | Cards de **Faturamento, Despesas, Lucro líquido e KM rodado** (hoje e mês) |
| Tema | **Dark mode** com alternância no cabeçalho |
| Banco | Script SQL idempotente que **migra a tabela `rides` existente** sem perder dados |

---

## Stack

- **Next.js 14** (App Router) + React 18 + TypeScript strict
- **Tailwind CSS** (design tokens navy `#102a47` + laranja `#b64a0c`, dark mode)
- Componentes no padrão **shadcn/ui**, ícones **Lucide**, toasts **Sonner**
- **Supabase** — PostgreSQL + Auth + RLS
- **qrcode** — gera o QR Code PIX no navegador (sem enviar dados a terceiros)

---

## Estrutura de pastas

```
src/
├── app/
│   ├── (auth)/entrar/          # Login / criar conta / recuperar senha
│   ├── (app)/                  # Área protegida (exige sessão)
│   │   ├── page.tsx            # Painel do dia e do mês
│   │   ├── registrar/          # Formulário de nova corrida
│   │   ├── historico/          # Histórico por dia
│   │   └── corrida/[id]/       # Edição da corrida + QR PIX
│   ├── layout.tsx              # Shell raiz, tema, metadados
│   └── globals.css             # Design tokens (claro/escuro)
├── components/
│   ├── ride-form.tsx           # Formulário completo (voz, cálculo, PIX)
│   ├── pix-qr-dialog.tsx       # QR Code + copia e cola + confirmação
│   ├── ride-card.tsx           # Card com status de pagamento
│   ├── dashboard-content.tsx   # Cards de resumo
│   ├── ride-list.tsx           # Histórico agrupado por dia
│   ├── auth-form.tsx           # Login/cadastro
│   ├── theme-toggle.tsx        # Alternância claro/escuro
│   └── ui/                     # Button, Input, Select, Modal, etc.
├── hooks/
│   ├── use-rides.ts            # Corridas do usuário logado
│   └── use-speech-recognition.ts
├── lib/
│   ├── brand.ts                # ← NOME, DONO e CHAVE PIX (edite aqui)
│   ├── calc.ts                 # Lucro, despesas, rendimento, consumo
│   ├── pix.ts                  # BR Code (copia e cola) + CRC16
│   ├── speech.ts               # “oitenta e cinco reais” → 85.00
│   ├── constants.ts            # Combustíveis, pagamentos, limites
│   ├── format.ts               # BRL, datas, km, unidades
│   ├── utils.ts                # cn() + mensagens de erro
│   └── supabase/               # clients browser/server + tipos
└── types/web-speech.d.ts       # Tipagem da Web Speech API
supabase/schema.sql             # Tabela + migração + RLS + índices
```

---

## 1. Banco de dados (Supabase)

1. Crie um projeto em [supabase.com](https://supabase.com) (o plano gratuito
   basta) ou use o projeto atual do RotaLucro.
2. Abra **SQL Editor → New query**, cole todo o
   [`supabase/schema.sql`](supabase/schema.sql) e clique em **Run**.

O script é **reexecutável** e faz a migração da tabela existente:

- adiciona `gasolina` ao enum de combustível (recriando o enum com segurança);
- adiciona `fuel_unit_price`, `extra_expenses`, `payment_method`,
  `payment_status`, `paid_at` e `pix_txid`;
- recalcula `profit` (`fare - fuel_cost - extra_expenses`) e cria `distance_km`;
- recria índices, trigger de `updated_at`, constraints e políticas de RLS.

> ⚠️ Se você tinha uma versão anterior da tabela, **rode o script uma vez**.
> As corridas antigas são preservadas; o preço unitário é preenchido com
> `fuel_cost ÷ fuel_quantity`.

### Modelo da tabela `rides`

| Coluna | Tipo | Descrição |
| --- | --- | --- |
| `id` | uuid (PK) | Identificador |
| `user_id` | uuid → `auth.users` | Dono da corrida (RLS) |
| `ride_at` | timestamptz | Data/hora da corrida |
| `fare` | numeric(12,2) | Valor recebido |
| `fuel_type` | enum | `gnv`, `alcool`, `gasolina` |
| `fuel_quantity` | numeric(12,2) | m³ (GNV) ou litros |
| `fuel_unit_price` | numeric(12,3) | Preço do litro/m³ |
| `fuel_cost` | numeric(12,2) | Quantidade × preço |
| `extra_expenses` | numeric(12,2) | Pedágio, lavagem, extras |
| `km_initial` | numeric(12,1) | KM inicial |
| `km_final` | numeric(12,1) | KM final (opcional) |
| `distance_km` | numeric(12,1) **gerada** | `km_final - km_initial` |
| `payment_method` | enum | `dinheiro`, `cartao`, `pix`, `aplicativo` |
| `payment_status` | enum | `pendente`, `pago` |
| `paid_at` | timestamptz | Confirmação do recebimento |
| `pix_txid` | text | Identificador do BR Code |
| `profit` | numeric(12,2) **gerada** | `fare - fuel_cost - extra_expenses` |
| `notes` | text | Observações (até 500) |
| `created_at` / `updated_at` | timestamptz | Auditoria |

**RLS:** `select`/`insert`/`update`/`delete` apenas para `authenticated` e
somente quando `auth.uid() = user_id`. Visitante anônimo não lê nada.

---

## 2. Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha com os dados do projeto
(Dashboard → **Settings → API**):

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key-aqui
```

A `anon key` é pública por design: quem protege os dados é o **RLS**.

### Login e confirmação de e-mail

O fluxo usa **Supabase Auth** (e-mail + senha):

- **Criar conta** envia o e-mail de confirmação (quando habilitado no projeto).
- **Entrar** valida e-mail/senha.
- **Esqueci minha senha** envia o link de recuperação.

Para testar mais rápido, desative *Authentication → Providers → Email →
Confirm email*. Em produção, mantenha ativo e configure o **SMTP** do seu
domínio (Authentication → SMTP Settings).

---

## 3. Rodar localmente

```bash
npm install
npm run dev
```

Abra http://localhost:3000, crie sua conta e registre a primeira corrida.

```bash
npm run build   # typecheck + build de produção
npm start       # serve o build
npm run lint    # ESLint
```

> A **entrada por voz** usa a Web Speech API nativa do navegador. Funciona em
> Chrome, Edge e Safari, em `localhost` ou HTTPS. Em navegadores sem suporte o
> botão fica desabilitado e o campo continua funcionando normalmente.

---

## 4. Personalização (marca e PIX)

Tudo o que é pessoal está em **`src/lib/brand.ts`**:

```ts
export const BRAND = {
  name: 'RotaRendaComLucro',
  fullName: 'Rota da Renda com Lucro',
  shortName: 'RotaRenda',
  tagline: 'Cada corrida, mais lucro no seu bolso.',
  owner: 'Maduqueu Antônio',
  pix: {
    key: '82191999468',          // CPF (somente números)
    keyType: 'CPF',
    merchantName: 'MADUQUEU ANTONIO',
    merchantCity: 'BRASIL',
  },
} as const;
```

- O cabeçalho, rodapé, metadados e o QR Code leem desse arquivo.
- A chave PIX fica **visível no QR Code**, como exige o PIX — não é segredo.
  Nunca coloque senhas, tokens ou dados bancários no app.
- Para trocar a cidade do recebedor no BR Code, ajuste `merchantCity`.

### Sobre “patentear” o aplicativo

No Brasil, **programa de computador não é patenteável** (Lei 9.279/96, art.
10, IV). A proteção usual é:

- **Direito autoral** sobre o código (a licença do repositório já reserva os
  direitos ao autor);
- **Registro de marca** no INPI (RotaRendaComLucro / Rota da Renda com Lucro);
- **Registro de programa de computador** no INPI (opcional, via e-Software);
- **Termos de uso e política de privacidade** (LGPD) para operar comercialmente.

O app já sai personalizado com seu nome; o registro formal da marca é feito no
INPI (não no código).

---

## 5. Como o PIX funciona (e o limite dele)

1. Ao salvar/editar uma corrida, o app pergunta: **“Gerar QR Code PIX?”**.
2. Se aceitar, ele gera o **BR Code estático** com valor, chave CPF, nome do
   recebedor e um `txid` único da corrida.
3. O passageiro paga pelo app do banco.
4. O motorista confere o crédito e toca em **“Já recebi o pagamento”**. O app
   grava `payment_status = 'pago'`, `paid_at` e exibe a **mensagem de
   confirmação de pagamento**.

**Importante:** QR Code estático **não envia callback** para o app. A
confirmação é manual (e honesta). Para confirmação automática de verdade, é
necessário contratar um **PSP** (Mercado Pago, Asaas, Efí, PagSeguro...) e
implementar um **webhook** que atualize `payment_status` no Supabase. O modelo
de dados já está pronto para isso: basta gravar o `pix_txid`/id da cobrança e
atualizar a linha no webhook.

---

## 6. Deploy (GitHub + Vercel)

### GitHub

```bash
git add .
git commit -m "RotaRendaComLucro 2.0: voz, gasolina, PIX e tema escuro"
git push origin main
```

### Vercel

1. Acesse [vercel.com/new](https://vercel.com/new) e importe
   `amaduqueu-art/rotalucro`.
2. Framework: **Next.js** (detectado automaticamente).
3. Em **Environment Variables**, adicione:

   | Nome | Valor |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key do projeto Supabase |

4. **Deploy**. Cada `git push` na `main` gera um novo deploy de produção.

> Sem as variáveis o app abre com um aviso amarelo de configuração — não quebra.

---

## 7. Acessibilidade e UX

- Área de toque mínima de 44 px em botões, tabs e microfone
- Inputs com fonte de 16 px (evita zoom automático no iOS) e
  `inputMode="decimal"` (teclado numérico no celular)
- `aria-invalid`, `aria-live` no lucro/resumo, foco automático no primeiro erro
- Skeletons nos carregamentos, toasts de feedback e exclusão em dois toques
- Tema claro/escuro com preferência salva e respeito a `prefers-reduced-motion`
- PWA básico (manifest + ícone) para adicionar à tela de início

---

## Licença

MIT — veja [LICENSE](LICENSE). Marca e identidade visual: Maduqueu Antônio.
