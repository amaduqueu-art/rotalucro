# RotaRendaComLucro 🚕💰

> Gestão financeira de corridas de táxi, por **Maduqueu Antônio**.
> Repositório: https://github.com/amaduqueu-art/rotalucro

Registre a corrida **falando o valor**, informe o **abastecimento só quando for
abastecer**, acompanhe a **rota no mapa** e veja o **lucro líquido** já com o
combustível **rateado entre as corridas**. Cobre por **PIX com QR Code** e
acompanhe faturamento, despesas e quilômetros rodados. Feito para quem vive no
volante — inclusive rodando à noite, com **tema escuro**.

Arquitetura **mobile-first**, login por e-mail e senha (com confirmação de
e-mail) e dados protegidos por **Row Level Security**: cada motorista vê apenas
as próprias corridas.

---

## O que mudou nesta versão (2.1)

| Área | Novidade |
| --- | --- |
| **Combustível** | **Abastecimento é um evento separado**: você informa quantidade/preço só quando abastece, pelo botão **“Abasteci agora”** |
| **Rateio** | Cada abastecimento é dividido entre as corridas seguintes, **proporcionalmente aos KM** — uma corrida de R$ 10 não desconta um tanque de R$ 50 inteiro |
| **Mapa** | Botão **“Iniciar rota”** abre um mini-mapa Leaflet/OpenStreetMap (gratuito, sem chave); a rota é salva com a corrida e pode ser revista no histórico |
| **Abastecimentos** | Tela **“Abastecer”** (menu inferior) com histórico, totais e exclusão em dois toques — o valor pago na bomba fica separado da parcela rateada |
| Marca | Nome personalizado **RotaRendaComLucro**, assinatura de **Maduqueu Antônio** |
| Combustíveis | **GNV, Álcool e Gasolina** |
| Entrada por voz | Botão de microfone ao lado do valor (Web Speech API, pt-BR) |
| Assistente | Botão **Assistente** no canto da tela: consulta lucro, despesas, KM e **gasto real em abastecimento**, e abre o formulário com o valor falado |
| Pagamento | Campo **Dinheiro, Cartão, PIX ou Aplicativo** |
| PIX | Após salvar, o app pergunta se deve gerar o **QR Code PIX** (CPF `821.919.994-68`) |
| Confirmação | Botão **“Já recebi o pagamento”** grava o pagamento e mostra a mensagem de confirmação |
| Despesas | Campo **Outras despesas** (pedágio, lavagem, lanche...) |
| Lucro | **Lucro líquido = valor da corrida − combustível rateado − outras despesas** |
| Rendimento | **R$ / KM rodado** e **consumo km/L (ou km/m³)** |
| Dashboard | Cards de **Faturamento, Despesas, Lucro líquido e KM rodado** + painel de abastecimentos |
| Tema | **Dark mode** com alternância no cabeçalho |
| Banco | Scripts SQL idempotentes que **migram sem perder dados**; o abastecimento antigo vira um registro em `fuel_refuels` |

---

## Stack

- **Next.js 14** (App Router) + React 18 + TypeScript strict
- **Tailwind CSS** (design tokens navy `#102a47` + laranja `#b64a0c`, dark mode)
- Componentes no padrão **shadcn/ui**, ícones **Lucide**, toasts **Sonner**
- **Supabase** — PostgreSQL + Auth + RLS
- **Leaflet + react-leaflet** com tiles do **OpenStreetMap** — mapa da rota (sem chave paga)
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
│   │   ├── abastecimentos/     # Histórico de abastecimentos
│   │   └── corrida/[id]/       # Edição da corrida + QR PIX
│   ├── layout.tsx              # Shell raiz, tema, metadados
│   └── globals.css             # Design tokens (claro/escuro)
├── components/
│   ├── ride-form.tsx           # Formulário (voz, rateio, rota, PIX)
│   ├── refuel-dialog.tsx       # Cadastro separado de abastecimento
│   ├── refuel-list.tsx         # Histórico, totais e exclusão de abastecimentos
│   ├── route-map.tsx           # Mapa Leaflet da rota
│   ├── route-map-panel.tsx     # Wrapper dynamic (ssr: false)
│   ├── pix-qr-dialog.tsx       # QR Code + copia e cola + confirmação
│   ├── ride-card.tsx           # Card com lucro e rota salva
│   ├── dashboard-content.tsx   # Cards de resumo + abastecimentos
│   ├── ride-list.tsx           # Histórico agrupado por dia
│   ├── auth-form.tsx           # Login/cadastro
│   ├── voice-assistant.tsx     # Assistente: voz, comandos e respostas
│   ├── theme-toggle.tsx        # Alternância claro/escuro
│   └── ui/                     # Button, Input, Select, Modal, etc.
├── hooks/
│   ├── use-rides.ts            # Corridas + abastecimentos e rateio
│   ├── use-route-tracker.ts    # watchPosition + fallback manual
│   ├── use-speech-recognition.ts # Ditado do valor da corrida
│   ├── use-voice-command.ts    # Ditado de comandos do assistente
│   └── use-speech-synthesis.ts # Respostas faladas (TTS)
├── lib/
│   ├── brand.ts                # ← NOME, DONO e CHAVE PIX (edite aqui)
│   ├── assistant.ts            # Comandos, períodos, resumos e respostas
│   ├── calc.ts                 # Lucro, despesas, rendimento, consumo
│   ├── fuel-allocation.ts      # Rateio por janela/KM
│   ├── route.ts                # Haversine, parsing e limite de pontos
│   ├── pix.ts                  # BR Code (copia e cola) + CRC16
│   ├── speech.ts               # “oitenta e cinco reais” → 85.00
│   ├── constants.ts            # Combustíveis, pagamentos, limites
│   ├── format.ts               # BRL, datas, km, unidades
│   ├── utils.ts                # cn() + mensagens de erro
│   └── supabase/               # clients browser/server + tipos
└── types/web-speech.d.ts       # Tipagem da Web Speech API
supabase/
├── schema.sql                  # Schema mestre (instalação limpa)
└── migration-2.1-fuel-route.sql # Migração 2.1 para projetos já instalados
scripts/test-assistant.ts       # Testes do assistente
scripts/test-fuel-route.ts      # Testes de rateio e rota
```

---

## 1. Banco de dados (Supabase)

1. Crie um projeto em [supabase.com](https://supabase.com) (o plano gratuito
   basta) ou use o projeto atual do RotaLucro.
2. **Projeto já instalado (2.0):** abra **SQL Editor → New query**, cole todo
   o [`supabase/migration-2.1-fuel-route.sql`](supabase/migration-2.1-fuel-route.sql)
   e clique em **Run**. Isso cria `fuel_refuels`, transfere os abastecimentos
   antigos das corridas e adiciona as colunas de rota.
3. **Instalação limpa:** rode apenas o
   [`supabase/schema.sql`](supabase/schema.sql), que já contém o equivalente
   da migração 2.1.

Ambos os scripts são **reexecutáveis** e preservam as corridas existentes.

> ⚠️ A migração 2.1 é **obrigatória** para abastecimentos e rota funcionarem.
> Sem ela o app continua lendo as corridas, mas os botões de abastecimento e
> o salvamento da rota falham.

### Como o combustível é rateado

Um abastecimento de R$ 50,00 pago na bomba **não** é descontado inteiro de uma
corrida de R$ 10,00. Ele é registrado uma vez em `fuel_refuels` e dividido entre
as corridas registradas até o **próximo abastecimento**:

- com KM informado, cada corrida paga na proporção dos seus KM rodados;
- sem KM, as corridas dividem o valor em partes iguais;
- a soma das parcelas é sempre exatamente o custo do abastecimento (a sobra do
  arredondamento vai na última corrida da janela).

Exemplo: R$ 50,00 abastecidos e 5 corridas de 10 km cada → R$ 10,00 de
combustível em cada uma (lucro de R$ 0,00 por corrida, não −R$ 40,00).
Se o motorista ainda não fez outras corridas, a prévia mostra a parcela maior
e se reequilibra conforme novas corridas são registradas.

### Modelo da tabela `rides`

| Coluna | Tipo | Descrição |
| --- | --- | --- |
| `id` | uuid (PK) | Identificador |
| `user_id` | uuid → `auth.users` | Dono da corrida (RLS) |
| `ride_at` | timestamptz | Data/hora da corrida |
| `fare` | numeric(12,2) | Valor recebido |
| `fuel_cost` | numeric(12,2) | **Parcela rateada** do abastecimento (R$) |
| `extra_expenses` | numeric(12,2) | Pedágio, lavagem, extras |
| `km_initial` | numeric(12,1) | KM inicial |
| `km_final` | numeric(12,1) | KM final (opcional) |
| `distance_km` | numeric(12,1) **gerada** | `km_final - km_initial` |
| `route` | jsonb | Pontos `{lat, lng, at, accuracy}` da rota capturada |
| `route_distance_km` | numeric(12,2) | Distância somada dos segmentos |
| `route_started_at` / `route_ended_at` | timestamptz | Horários da captura |
| `payment_method` | enum | `dinheiro`, `cartao`, `pix`, `aplicativo` |
| `payment_status` | enum | `pendente`, `pago` |
| `paid_at` | timestamptz | Confirmação do recebimento |
| `pix_txid` | text | Identificador do BR Code |
| `profit` | numeric(12,2) **gerada** | `fare - fuel_cost rateado - extra_expenses` |
| `notes` | text | Observações (até 500) |
| `created_at` / `updated_at` | timestamptz | Auditoria |

As colunas antigas `fuel_type`, `fuel_quantity` e `fuel_unit_price` continuam na
tabela apenas para histórico/migração; o app não as usa mais em corridas.

### Modelo da tabela `fuel_refuels`

| Coluna | Tipo | Descrição |
| --- | --- | --- |
| `id` | uuid (PK) | Identificador |
| `user_id` | uuid → `auth.users` | Dono do abastecimento (RLS) |
| `fueled_at` | timestamptz | Data/hora do abastecimento |
| `fuel_type` | enum | `gnv`, `alcool`, `gasolina` |
| `quantity` | numeric(12,2) | Litros ou m³ |
| `unit_price` | numeric(12,3) | Preço unitário na bomba |
| `total_cost` | numeric(12,2) | `quantity × unit_price` |
| `odometer` | numeric(12,1) | KM do painel (opcional) |
| `station` / `notes` | text | Posto e observações (opcionais) |

**RLS:** `select`/`insert`/`update`/`delete` apenas para `authenticated` e
somente quando `auth.uid() = user_id` — em **ambas** as tabelas. Visitante
anônimo não lê nada.

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
npm test        # testes do assistente + rateio/rota
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

## 6. Assistente de voz

O botão flutuante **Assistente** (canto inferior direito, acima da navegação no
celular) abre um painel de conversa. Ele funciona em todas as telas protegidas e
usa a **Web Speech API** do navegador, sem chave de API e sem custo.

### Comandos de consulta

| Você fala | O assistente responde |
| --- | --- |
| “Quanto lucrei hoje?” | Lucro líquido de hoje e quantidade de corridas |
| “Quanto faturei este mês?” | Faturamento do mês corrente |
| “Quanto gastei em abastecimento?” | **Valor realmente pago na bomba** no período (soma dos abastecimentos) |
| “Quanto gastei de gasolina esta semana?” | Gasto de combustível nos últimos 7 dias |
| “Quanto gastei este mês?” | Combustível + despesas extras do mês |
| “Quantos km rodei?” | Quilometragem de hoje |
| “Qual meu lucro por km?” | Lucro médio por quilômetro |
| “Quantas corridas fiz no total?” | Total de corridas registradas |
| “Resumo do mês” | Faturamento, despesas, lucro, KM e lucro/km |

Períodos aceitos: **hoje** (padrão), **ontem**, **esta semana** (7 dias),
**este mês** e **no total**.

> 💡 **Dois números diferentes, ambos corretos:** “combustível” é a parcela
> rateada entre as corridas (usada no lucro); “abastecimento” é o dinheiro
> realmente gasto na bomba. Perguntar **“Quanto gastei em abastecimento?”**
> responde com o valor pago nos postos, mesmo que ainda não haja corridas no
> período para receber a parcela.

### Comandos de ação

- **“Registrar corrida de 25 reais”** — abre `/registrar` com o valor já
  preenchido; confira o KM e inicie a rota no mapa, se quiser. O assistente
  **nunca** salva a corrida sozinho.
- **“Abrir histórico”** — vai para `/historico`.
- **“Voltar ao painel”** — vai para a tela inicial.
- **“Ajuda”** — lista os comandos disponíveis.

A resposta é falada pela voz nativa do sistema (pt-BR) e também aparece como
texto. O botão **Voz ligada/desligada** silencia apenas o áudio; a conversa
continua no painel. Se o navegador não suportar ditado, o campo de texto
funciona como alternativa.

### Limitações

- A escuta só acontece com o painel aberto e o botão **Falar** acionado; não há
  palavra de ativação em segundo plano.
- Chrome, Edge e Safari têm melhor suporte. O Firefox não implementa a Web
  Speech API.
- A voz é sintetizada pelo sistema operacional; a qualidade varia por aparelho.
- O assistente não cria corrida sozinho: ele preenche o valor e abre o
  formulário para você confirmar os demais campos.

Os testes ficam em `scripts/test-assistant.ts` e `scripts/test-fuel-route.ts`
(e cobrem o caso R$ 10 × R$ 50, conservação do custo, janelas de abastecimento,
distância da rota e respostas do assistente com abastecimentos reais). Execute
com `npm test`.

---

## 6.1. Rota e privacidade do GPS

- Toque em **Iniciar rota** ao começar a corrida. O app usa
  `navigator.geolocation.watchPosition` e desenha o trajeto no mini-mapa com
  **Leaflet + OpenStreetMap** (sem chave de API e sem custo).
- Toque em **Encerrar rota** ao finalizar. Os pontos, a distância calculada e
  os horários são salvos junto com a corrida em `rides.route`. No histórico,
  o botão **Ver rota no mapa** reapresenta o trajeto.
- Se o navegador negar a localização, você pode **tocar no mapa** para marcar
  os pontos manualmente.
- **Nenhum ponto é enviado a serviço de terceiros**: os dados ficam no seu
  projeto Supabase, protegidos por RLS. Os tiles do mapa são carregados do
  OpenStreetMap pelo navegador; ao desativar a permissão de localização,
  nenhuma posição é capturada.
- Por privacidade, evite registrar a rota de casa até o posto ou de locais
  sensíveis: a rota fica visível apenas na sua conta, mas é dados pessoais.

---

## 7. Deploy (GitHub + Vercel)

### GitHub

```bash
git add .
git commit -m "RotaRendaComLucro 2.1: abastecimento rateado e rota no mapa"
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

## 8. Acessibilidade e UX

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
