-- =============================================================================
-- RotaRendaComLucro — Esquema do banco (Supabase / PostgreSQL)
-- =============================================================================
-- COMO USAR
--   Dashboard do Supabase → SQL Editor → New query → cole TODO este arquivo
--   → Run. O script é reexecutável e também MIGRA a tabela `rides` antiga
--   (RotaLucro), preservando as corridas já registradas.
--
-- O que este script faz:
--   1. Cria/migra os enums fuel_type (GNV, Álcool, Gasolina), payment_method
--      e payment_status.
--   2. Cria a tabela `rides` (ou adiciona as novas colunas na existente):
--      preço unitário, despesas extras, forma de pagamento, status PIX etc.
--   3. Recalcula as colunas geradas `profit` e `distance_km`.
--   4. Recria índices, trigger de updated_at e políticas de RLS.
--
-- Segurança: cada motorista lê e edita SOMENTE as próprias corridas
-- (auth.uid() = user_id). Visitante anônimo não acessa nada.
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 1. Tipos enumerados
-- -----------------------------------------------------------------------------

-- Combustível: cria do zero ou adiciona 'gasolina' ao enum existente.
-- O enum é recriado (em vez de ALTER TYPE ADD VALUE) para funcionar em uma
-- única transação e já aceitar o novo valor nas mesmas instruções abaixo.
do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'fuel_type' and n.nspname = 'public'
  ) then
    create type public.fuel_type as enum ('gnv', 'alcool', 'gasolina');
  elsif not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'fuel_type'
      and n.nspname = 'public'
      and e.enumlabel = 'gasolina'
  ) then
    alter type public.fuel_type rename to fuel_type_old;
    create type public.fuel_type as enum ('gnv', 'alcool', 'gasolina');

    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'rides'
        and column_name = 'fuel_type'
    ) then
      alter table public.rides
        alter column fuel_type type public.fuel_type
        using (fuel_type::text::public.fuel_type);
    end if;

    drop type public.fuel_type_old;
  end if;
end $$;

do $$
begin
  create type public.payment_method as enum (
    'dinheiro',
    'cartao',
    'pix',
    'aplicativo'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.payment_status as enum ('pendente', 'pago');
exception
  when duplicate_object then null;
end $$;

-- -----------------------------------------------------------------------------
-- 2. Tabela `rides`
-- -----------------------------------------------------------------------------
create table if not exists public.rides (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  ride_at           timestamptz not null,

  -- Receita
  fare              numeric(12,2) not null,

  -- Combustível
  fuel_type         public.fuel_type not null,
  -- Litros (álcool/gasolina) ou metros cúbicos (GNV).
  fuel_quantity     numeric(12,2) not null,
  -- Preço por litro ou m³ no momento do abastecimento.
  fuel_unit_price   numeric(12,3) not null default 0,
  -- Custo = quantidade × preço unitário (preenchido pelo app).
  fuel_cost         numeric(12,2) not null,

  -- Despesas extras do trajeto (pedágio, lavagem, lanche...).
  extra_expenses    numeric(12,2) not null default 0,

  -- Quilometragem
  km_initial        numeric(12,1) not null,
  km_final          numeric(12,1),

  -- Pagamento
  payment_method    public.payment_method not null default 'dinheiro',
  payment_status    public.payment_status not null default 'pago',
  paid_at           timestamptz,
  pix_txid          text,

  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Migração da tabela antiga: adiciona apenas o que ainda não existe.
alter table public.rides
  add column if not exists fuel_unit_price numeric(12,3);
alter table public.rides
  add column if not exists extra_expenses numeric(12,2) not null default 0;
alter table public.rides
  add column if not exists payment_method public.payment_method not null default 'dinheiro';
alter table public.rides
  add column if not exists payment_status public.payment_status not null default 'pago';
alter table public.rides
  add column if not exists paid_at timestamptz;
alter table public.rides
  add column if not exists pix_txid text;

-- Backfill do preço unitário nas corridas antigas (custo ÷ quantidade).
update public.rides
set fuel_unit_price = round(fuel_cost / nullif(fuel_quantity, 0), 3)
where fuel_unit_price is null or fuel_unit_price <= 0;

update public.rides
set fuel_unit_price = 0
where fuel_unit_price is null;

alter table public.rides
  alter column fuel_unit_price set default 0;
alter table public.rides
  alter column fuel_unit_price set not null;

-- Colunas geradas (sempre coerentes, calculadas pelo PostgreSQL).
alter table public.rides drop column if exists profit;
alter table public.rides
  add column profit numeric(12,2)
  generated always as (fare - fuel_cost - extra_expenses) stored;

alter table public.rides drop column if exists distance_km;
alter table public.rides
  add column distance_km numeric(12,1)
  generated always as (
    case when km_final is null then null else km_final - km_initial end
  ) stored;

-- -----------------------------------------------------------------------------
-- 3. Comentários (documentação viva)
-- -----------------------------------------------------------------------------
comment on table public.rides is
  'Corridas de táxi registradas pelo motorista (uma por registro de caixa).';

comment on column public.rides.ride_at is
  'Data e hora em que a corrida aconteceu (timestamp automático do registro).';

comment on column public.rides.fare is
  'Valor recebido pela corrida (R$).';

comment on column public.rides.fuel_type is
  'Combustível abastecido: GNV, Álcool ou Gasolina.';

comment on column public.rides.fuel_quantity is
  'Quantidade abastecida: litros (álcool/gasolina) ou metros cúbicos (GNV).';

comment on column public.rides.fuel_unit_price is
  'Preço por litro ou m³ no abastecimento.';

comment on column public.rides.fuel_cost is
  'Custo do combustível = quantidade × preço unitário (R$).';

comment on column public.rides.extra_expenses is
  'Outras despesas do trajeto: pedágio, lavagem, lanche etc. (R$).';

comment on column public.rides.km_initial is
  'Quilometragem do painel no início da corrida.';

comment on column public.rides.km_final is
  'Quilometragem do painel no fim da corrida (opcional).';

comment on column public.rides.payment_method is
  'Como a corrida foi paga: dinheiro, cartão, PIX ou aplicativo.';

comment on column public.rides.payment_status is
  'pendente (aguardando PIX) ou pago.';

comment on column public.rides.paid_at is
  'Momento em que o recebimento foi confirmado.';

comment on column public.rides.pix_txid is
  'Identificador da cobrança PIX (campo txid do BR Code).';

comment on column public.rides.profit is
  'Lucro líquido = fare − fuel_cost − extra_expenses (gerada pelo banco).';

comment on column public.rides.distance_km is
  'KM rodados = km_final − km_initial (gerada; null sem KM final).';

-- -----------------------------------------------------------------------------
-- 4. Constraints (validações)
-- -----------------------------------------------------------------------------
alter table public.rides drop constraint if exists rides_fare_positive;
alter table public.rides
  add constraint rides_fare_positive check (fare > 0);

alter table public.rides drop constraint if exists rides_fuel_quantity_positive;
alter table public.rides
  add constraint rides_fuel_quantity_positive check (fuel_quantity > 0);

alter table public.rides drop constraint if exists rides_fuel_unit_price_non_negative;
alter table public.rides
  add constraint rides_fuel_unit_price_non_negative
  check (fuel_unit_price >= 0);

alter table public.rides drop constraint if exists rides_fuel_cost_non_negative;
alter table public.rides
  add constraint rides_fuel_cost_non_negative check (fuel_cost >= 0);

alter table public.rides drop constraint if exists rides_extra_expenses_non_negative;
alter table public.rides
  add constraint rides_extra_expenses_non_negative
  check (extra_expenses >= 0);

alter table public.rides drop constraint if exists rides_km_initial_non_negative;
alter table public.rides
  add constraint rides_km_initial_non_negative check (km_initial >= 0);

alter table public.rides drop constraint if exists rides_km_final_when_present;
alter table public.rides
  add constraint rides_km_final_when_present
  check (km_final is null or km_final >= km_initial);

alter table public.rides drop constraint if exists rides_notes_length;
alter table public.rides
  add constraint rides_notes_length
  check (notes is null or char_length(btrim(notes)) <= 500);

-- -----------------------------------------------------------------------------
-- 5. Índices
-- -----------------------------------------------------------------------------
create index if not exists rides_user_id_idx
  on public.rides (user_id, ride_at desc);

create index if not exists rides_ride_at_idx
  on public.rides (ride_at desc);

create index if not exists rides_fuel_type_idx
  on public.rides (fuel_type);

create index if not exists rides_payment_status_idx
  on public.rides (user_id, payment_status);

-- -----------------------------------------------------------------------------
-- 6. Triggers
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists rides_set_updated_at on public.rides;
create trigger rides_set_updated_at
  before update on public.rides
  for each row
  when (old.* is distinct from new.*)
  execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 7. Row Level Security (RLS)
-- -----------------------------------------------------------------------------
-- PRINCÍPIO: cada motorista só enxerga e altera as PRÓPRIAS corridas.
-- Login obrigatório: sem políticas para `anon`.

alter table public.rides enable row level security;

drop policy if exists "rides_select_own" on public.rides;
drop policy if exists "rides_insert_own" on public.rides;
drop policy if exists "rides_update_own" on public.rides;
drop policy if exists "rides_delete_own" on public.rides;

create policy "rides_select_own"
  on public.rides
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "rides_insert_own"
  on public.rides
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "rides_update_own"
  on public.rides
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "rides_delete_own"
  on public.rides
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 8. Permissões (defesa em profundidade)
-- -----------------------------------------------------------------------------
revoke all on public.rides from anon;
grant select, insert, update, delete on public.rides to authenticated;

-- -----------------------------------------------------------------------------
-- 9. Verificação rápida (opcional)
-- -----------------------------------------------------------------------------
-- select tablename, rowsecurity from pg_tables where schemaname = 'public';
-- select policyname, cmd, roles from pg_policies where schemaname = 'public';

notify pgrst, 'reload schema';
