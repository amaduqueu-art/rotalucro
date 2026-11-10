-- =============================================================================
-- RotaLucro — Esquema do banco de dados (Supabase / PostgreSQL)
-- =============================================================================
-- Execute este arquivo no SQL Editor do Supabase (Dashboard → SQL Editor →
-- New query → cole tudo → Run). Depois configure o `.env.local` conforme o
-- README e crie sua conta pela tela de login do app.
--
-- Este script cria:
--   1. Tipo enumerado `fuel_type` (GNV / Álcool)
--   2. Tabela `rides` (corridas) com validações e índices
--   3. Trigger `updated_at`
--   4. Row Level Security (RLS): cada motorista vê e edita SÓ as próprias
--      corridas
--   5. Permissões de tabela (defesa em profundidade)
--
-- Reexecutável: pode rodar quantas vezes quiser sem duplicar objetos.
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 1. Tipos enumerados
-- -----------------------------------------------------------------------------
do $$
begin
  create type public.fuel_type as enum (
    'gnv',
    'alcool'
  );
exception
  when duplicate_object then null;
end $$;

-- -----------------------------------------------------------------------------
-- 2. Tabelas
-- -----------------------------------------------------------------------------
create table if not exists public.rides (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  ride_at         timestamptz not null,
  fare            numeric(12,2) not null,
  fuel_type       public.fuel_type not null,
  -- Litros quando `fuel_type = 'alcool'`; metros cúbicos quando 'gnv'.
  fuel_quantity   numeric(12,2) not null,
  fuel_cost       numeric(12,2) not null,
  km_initial      numeric(12,1) not null,
  km_final        numeric(12,1),
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- Lucro calculado automaticamente pelo banco: recebido − combustível.
  -- Coluna gerada, sempre coerente com os dados gravados.
  profit           numeric(12,2) generated always as (fare - fuel_cost) stored,

  constraint rides_fare_positive check (fare > 0),
  constraint rides_fuel_quantity_positive check (fuel_quantity > 0),
  constraint rides_fuel_cost_non_negative check (fuel_cost >= 0),
  constraint rides_km_initial_non_negative check (km_initial >= 0),
  constraint rides_km_final_when_present check (
    km_final is null or (km_final >= km_initial)
  ),
  constraint rides_notes_length
    check (notes is null or char_length(btrim(notes)) <= 500)
);

comment on table public.rides is
  'Corridas de táxi registradas pelo motorista (uma por registro de caixa).';

comment on column public.rides.ride_at is
  'Data e hora em que a corrida aconteceu.';

comment on column public.rides.fare is
  'Valor recebido pela corrida (R$).';

comment on column public.rides.fuel_type is
  'Tipo de combustível abastecido: GNV ou Álcool.';

comment on column public.rides.fuel_quantity is
  'Quantidade abastecida: litros (álcool) ou metros cúbicos (GNV).';

comment on column public.rides.fuel_cost is
  'Valor total gasto com o combustível (R$).';

comment on column public.rides.km_initial is
  'Quilometragem do painel logo após o abastecimento.';

comment on column public.rides.km_final is
  'Quilometragem no momento do próximo abastecimento (opcional no registro).';

comment on column public.rides.profit is
  'Lucro = valor recebido − valor gasto com combustível (gerada pelo banco).';

-- Índices para o histórico e o painel (ordenação por data e filtro por usuário).
create index if not exists rides_user_id_idx
  on public.rides (user_id, ride_at desc);

create index if not exists rides_ride_at_idx
  on public.rides (ride_at desc);

create index if not exists rides_fuel_type_idx
  on public.rides (fuel_type);

-- -----------------------------------------------------------------------------
-- 3. Triggers
-- -----------------------------------------------------------------------------

-- Mantém `updated_at` sempre atualizado.
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
-- 4. Row Level Security (RLS)
-- -----------------------------------------------------------------------------
-- PRINCÍPIO: cada motorista só enxerga e altera as PRÓPRIAS corridas.
-- Login obrigatório: sem políticas para `anon` — visitante não lê nada.

alter table public.rides enable row level security;

-- Remove políticas antigas para permitir reexecução segura do script.
drop policy if exists "rides_select_own" on public.rides;
drop policy if exists "rides_insert_own" on public.rides;
drop policy if exists "rides_update_own" on public.rides;
drop policy if exists "rides_delete_own" on public.rides;

-- CORRIDAS: o motorista lê apenas as próprias.
create policy "rides_select_own"
  on public.rides
  for select
  to authenticated
  using (auth.uid() = user_id);

-- CORRIDAS: o motorista insere apenas em nome próprio.
create policy "rides_insert_own"
  on public.rides
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- CORRIDAS: o motorista edita apenas as próprias.
create policy "rides_update_own"
  on public.rides
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- CORRIDAS: o motorista exclui apenas as próprias.
create policy "rides_delete_own"
  on public.rides
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 5. Permissões (defesa em profundidade)
-- -----------------------------------------------------------------------------
revoke all on public.rides from anon;
grant select, insert, update, delete on public.rides to authenticated;

-- -----------------------------------------------------------------------------
-- 6. Verificação rápida (opcional)
-- -----------------------------------------------------------------------------
-- select tablename, rowsecurity from pg_tables where schemaname = 'public';
-- select policyname, cmd, roles from pg_policies where schemaname = 'public';

-- Garante que a API REST (PostgREST) enxergue a tabela imediatamente.
notify pgrst, 'reload schema';
