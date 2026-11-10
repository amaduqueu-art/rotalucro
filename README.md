# RotaLucro 🚕

Controle financeiro de corridas de táxi, feito para quem vive no volante: registre
o valor recebido, o abastecimento (GNV ou Álcool) e a quilometragem — o **lucro
é calculado automaticamente** e o histórico organiza tudo por dia.

Arquitetura **mobile-first**, com login por e-mail e senha e dados protegidos por
**Row Level Security (RLS)**: cada motorista vê apenas as próprias corridas.

## Funcionalidades

- 🔐 **Login e senha** (e-mail + senha via Supabase Auth, com recuperação de senha)
- 📝 **Registro da corrida** em coluna única, com campos:
  1. Data e hora da corrida
  2. Valor recebido (R$)
  3. Tipo de combustível (GNV ou Álcool) e quantidade — **m³** para GNV, **litros** para Álcool
  4. Quilometragem (KM) inicial — logo após o abastecimento
  5. Quilometragem (KM) final — lançada no próximo abastecimento (editável depois)
  6. Valor total gasto com combustível
- 💰 **Lucro calculado automaticamente** (recebido − combustível), exibido em tempo real enquanto digita e em destaque nos cards
- 📅 **Histórico** em cards organizados por dia, com filtros de período e lucro diário
- 📊 **Painel** com resumo de hoje e do mês (corridas, recebido, combustível, lucro)
- ✏️ Edição e exclusão de corridas (exclusão em dois toques)
- 💀 Skeletons de carregamento, toasts de feedback e botões com área de toque ≥ 44px

## Stack

- [Next.js 14](https://nextjs.org/) (App Router) + TypeScript strict
- [Tailwind CSS](https://tailwindcss.com/) com design tokens (navy `#102a47` + laranja `#b64a0c`)
- Componentes no padrão [shadcn/ui](https://ui.shadcn.com/) e ícones [Lucide](https://lucide.dev/)
- [Supabase](https://supabase.com/) — PostgreSQL + Auth + RLS
- [Sonner](https://sonner.emilk.io/) para toasts

## Como rodar localmente

1. **Clone e instale:**

   ```bash
   npm install
   ```

2. **Crie o projeto no [Supabase](https://supabase.com/)** (plano gratuito basta):
   - New project → escolha nome, senha do banco e região.

3. **Crie a tabela com RLS:**
   - Dashboard → **SQL Editor** → New query → cole todo o conteúdo de
     [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
   - ✅ O script é reexecutável e cria a tabela `rides`, a coluna gerada
     `profit`, os índices, o trigger `updated_at` e todas as políticas de RLS.

4. **Configure as variáveis de ambiente:**
   - Copie `.env.example` para `.env.local`.
   - Dashboard → **Settings → API** → copie `Project URL` e a `anon public key`.

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key-aqui
   ```

5. **(Opcional) desative a confirmação de e-mail** para testar mais rápido:
   Dashboard → Authentication → Providers → Email → desmarque
   *"Confirm email"*. Se deixar ativada, o app mostra o aviso para confirmar
   antes do primeiro login.

6. **Rode o app:**

   ```bash
   npm run dev
   ```

   Abra http://localhost:3000, crie sua conta em **Criar conta** e comece a
   registrar corridas.

## Deploy na Vercel

O jeito mais simples (a Vercel é da equipe do Next.js):

1. Suba este repositório para o GitHub.
2. Acesse [vercel.com/new](https://vercel.com/new), importe o repositório.
3. Em **Environment Variables**, adicione:

   | Nome | Valor |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | URL do seu projeto Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key do seu projeto Supabase |

4. Deploy. Pronto — o app roda em `https://seu-projeto.vercel.app`.

> A anon key é pública por design: o que protege os dados é o **RLS** no
> PostgreSQL, que só libera as linhas do usuário autenticado.

## Estrutura

```
src/
├── app/
│   ├── (auth)/entrar/        # Login / criar conta (rota pública)
│   ├── (app)/                # Área protegida (exige sessão)
│   │   ├── page.tsx          # Painel: resumo de hoje e do mês
│   │   ├── registrar/       # Formulário de nova corrida
│   │   ├── historico/        # Feed de corridas por dia
│   │   └── corrida/[id]/     # Edição de corrida
│   ├── layout.tsx            # Shell raiz (fonte, providers)
│   └── globals.css           # Design tokens (navy/laranja) e utilitários
├── components/              # Formulários, cards, navegação inferior, UI
├── hooks/use-rides.ts       # Carregamento das corridas do usuário
└── lib/
    ├── supabase/             # clients (browser/server), env, tipos do banco
    ├── constants.ts          # opções de combustível e limites
    ├── format.ts             # formatação BRL, datas, km, unidades
    └── utils.ts              # cn() + mensagens de erro
supabase/schema.sql          # Tabela + RLS + índices + triggers
```

## Modelagem dos dados (`rides`)

| Coluna | Tipo | Descrição |
| --- | --- | --- |
| `id` | uuid (PK) | Identificador |
| `user_id` | uuid → `auth.users` | Dono da corrida (FK, cascade) |
| `ride_at` | timestamptz | Data e hora da corrida |
| `fare` | numeric(12,2) | Valor recebido |
| `fuel_type` | enum `fuel_type` | `gnv` \| `alcool` |
| `fuel_quantity` | numeric(12,2) | m³ (GNV) ou litros (Álcool) |
| `fuel_cost` | numeric(12,2) | Valor gasto no abastecimento |
| `km_initial` | numeric(12,1) | KM logo após o abastecimento |
| `km_final` | numeric(12,1) | KM no próximo abastecimento (opcional) |
| `notes` | text | Observações (até 500 caracteres) |
| `profit` | numeric(12,2) **gerada** | `fare - fuel_cost` (sempre coerente) |

**RLS:** `select`/`insert`/`update`/`delete` apenas para `authenticated` e
apenas quando `auth.uid() = user_id`. Visitante anônimo não lê nada.

## Acessibilidade e UX

- Área de toque mínima de 44px em todos os botões e navegação
- Inputs com fonte de 16px (evita zoom automático no iOS)
- `datetime-local` e `select` nativos (teclado adequado no celular)
- Skip link, `aria-invalid`, `aria-live` no lucro calculado, foco automático no
  primeiro erro, skeletons nos carregamentos e `prefers-reduced-motion`
