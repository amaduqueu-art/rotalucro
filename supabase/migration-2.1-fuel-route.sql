-- =============================================================================
-- RotaRendaComLucro 2.1 — Abastecimento separado + rota salva
-- =============================================================================
-- COMO USAR
--   Supabase Dashboard → SQL Editor → New query → cole TODO este arquivo → Run.
--   Pode ser executado quantas vezes quiser (idempotente).
--
-- O que muda:
--   1. Cria `fuel_refuels`: abastecimentos são eventos independentes.
--   2. Transfere os abastecimentos que estavam presos às corridas antigas para
--      a tabela nova e zera o `fuel_cost` das corridas (ele passa a ser o
--      custo RATEADO, recalculado pelo app).
--   3. Adiciona às corridas os campos de rota (JSON com os pontos, distância
--      calculada e horários de início/fim).
--   4. Recria RLS, índices e comentários. Nenhuma corrida é apagada.
--
-- Regra de negócio: você NÃO abastece a cada corrida. O valor de um
-- abastecimento é dividido entre as corridas registradas até o próximo
-- abastecimento, proporcionalmente aos KM de cada uma.
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 1. Tabela de abastecimentos
-- -----------------------------------------------------------------------------
create table if not exists public.fuel_refuels (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  fueled_at    timestamptz not null default now(),
  fuel_type    public.fuel_type not null,
  -- Litros (álcool/gasolina) ou m³ (GNV).
  quantity     numeric(12,2) not null,
  -- Preço por litro ou m³ na bomba.
  unit_price   numeric(12,3) not null,
  -- quantity × unit_price, gravado pelo app.
  total_cost   numeric(12,2) not null,
  -- Leitura do odômetro no momento do abastecimento (opcional).
  odometer     numeric(12,1),
  station      text,
  notes        text,
  created_at   timestamptz not null default now()
);

alter table public.fuel_refuels
  drop constraint if exists fuel_refuels_quantity_positive;
alter table public.fuel_refuels
  add constraint fuel_refuels_quantity_positive check (quantity > 0);

alter table public.fuel_refuels
  drop constraint if exists fuel_refuels_unit_price_non_negative;
alter table public.fuel_refuels
  add constraint fuel_refuels_unit_price_non_negative check (unit_price >= 0);

alter table public.fuel_refuels
  drop constraint if exists fuel_refuels_total_cost_non_negative;
alter table public.fuel_refuels
  add constraint fuel_refuels_total_cost_non_negative check (total_cost >= 0);

alter table public.fuel_refuels
  drop constraint if exists fuel_refuels_notes_length;
alter table public.fuel_refuels
  add constraint fuel_refuels_notes_length
  check (notes is null or char_length(btrim(notes)) <= 500);

create index if not exists fuel_refuels_user_fueled_at_idx
  on public.fuel_refuels (user_id, fueled_at desc);

comment on table public.fuel_refuels is
  'Abastecimentos registrados pelo motorista (eventos independentes das corridas).';
comment on column public.fuel_refuels.total_cost is
  'Custo total do abastecimento = quantity × unit_price (R$). Rateado entre as corridas seguintes pelo app.';
comment on column public.fuel_refuels.odometer is
  'KM do painel no momento do abastecimento (opcional, ajuda a conferir o consumo).';

-- -----------------------------------------------------------------------------
-- 2. Migração dos dados antigos (somente uma vez por abastecimento)
-- -----------------------------------------------------------------------------
insert into public.fuel_refuels (
  user_id, fueled_at, fuel_type, quantity, unit_price, total_cost,
  odometer, notes
)
select
  r.user_id,
  r.ride_at,
  r.fuel_type,
  case when coalesce(r.fuel_quantity, 0) > 0 then r.fuel_quantity else 1 end,
  coalesce(r.fuel_unit_price, 0),
  coalesce(r.fuel_cost, 0),
  r.km_initial,
  'Abastecimento migrado do registro de corrida antigo.'
from public.rides r
where coalesce(r.fuel_cost, 0) > 0
  and not exists (
    select 1
    from public.fuel_refuels f
    where f.user_id = r.user_id
      and f.fueled_at = r.ride_at
      and f.total_cost = r.fuel_cost
  );

-- `fuel_cost` deixa de ser "o abastecimento inteiro" e passa a ser a parcela
-- rateada. O app recalcula todas as parcelas ao abrir/salvar dados.
update public.rides
set fuel_cost = 0
where coalesce(fuel_cost, 0) <> 0;

comment on column public.rides.fuel_cost is
  'Parcela do combustível rateada para esta corrida (R$). Recalculada pelo app a partir de fuel_refuels.';
comment on column public.rides.profit is
  'Lucro líquido = fare − fuel_cost rateado − extra_expenses (gerada pelo banco).';

-- -----------------------------------------------------------------------------
-- 3. Rota das corridas
-- -----------------------------------------------------------------------------
alter table public.rides
  add column if not exists route jsonb;
alter table public.rides
  add column if not exists route_distance_km numeric(12,2);
alter table public.rides
  add column if not exists route_started_at timestamptz;
alter table public.rides
  add column if not exists route_ended_at timestamptz;

comment on column public.rides.route is
  'Pontos da rota [{"lat":-23.5,"lng":-46.6,"at":"ISO", "accuracy": 12}], gravados quando o motorista inicia a corrida.';
comment on column public.rides.route_distance_km is
  'Distância da rota capturada (soma dos segmentos), em km.';
comment on column public.rides.route_started_at is
  'Momento em que o rastreamento da rota foi iniciado.';
comment on column public.rides.route_ended_at is
  'Momento em que o rastreamento da rota foi encerrado.';

-- -----------------------------------------------------------------------------
-- 4. RLS — cada motorista acessa somente seus próprios dados
-- -----------------------------------------------------------------------------
alter table public.fuel_refuels enable row level security;

drop policy if exists "fuel_refuels_select_own" on public.fuel_refuels;
drop policy if exists "fuel_refuels_insert_own" on public.fuel_refuels;
drop policy if exists "fuel_refuels_update_own" on public.fuel_refuels;
drop policy if exists "fuel_refuels_delete_own" on public.fuel_refuels;

create policy "fuel_refuels_select_own"
  on public.fuel_refuels for select to authenticated
  using (auth.uid() = user_id);

create policy "fuel_refuels_insert_own"
  on public.fuel_refuels for insert to authenticated
  with check (auth.uid() = user_id);

create policy "fuel_refuels_update_own"
  on public.fuel_refuels for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "fuel_refuels_delete_own"
  on public.fuel_refuels for delete to authenticated
  using (auth.uid() = user_id);

revoke all on public.fuel_refuels from anon;
grant select, insert, update, delete on public.fuel_refuels to authenticated;

-- -----------------------------------------------------------------------------
-- 5. Correção aplicada também na migration 2.2
-- -----------------------------------------------------------------------------
-- O app 2.1+ não preenche mais fuel_type/fuel_quantity ao salvar uma corrida:
-- o abastecimento passou a ser um evento em `fuel_refuels`. Mantê-las NOT NULL
-- causava erro intermitente no insert. Valores antigos são preservados.
alter table public.rides
  alter column fuel_type drop not null,
  alter column fuel_quantity drop not null,
  alter column fuel_cost set default 0;

alter table public.rides drop constraint if exists rides_fuel_quantity_positive;
alter table public.rides
  add constraint rides_fuel_quantity_positive
  check (fuel_quantity is null or fuel_quantity > 0);

notify pgrst, 'reload schema';

-- Verificação rápida (opcional):
-- select count(*) as abastecimentos from public.fuel_refuels;
-- select id, fuel_cost, route_distance_km from public.rides order by ride_at desc limit 5;
