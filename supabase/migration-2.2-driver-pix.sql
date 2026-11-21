-- =============================================================================
-- RotaRendaComLucro 2.2 — Chave PIX por motorista + correção ao salvar corrida
-- =============================================================================
-- COMO USAR
--   Supabase Dashboard → SQL Editor → New query → cole TODO este arquivo → Run.
--   Pode ser executado quantas vezes quiser (idempotente).
--
-- O que muda:
--   1. Cria `driver_profiles`: cada taxista cadastra SUA chave PIX no app
--      (Configurações), sem alterar código nem chave global.
--   2. Corrige o erro intermitente ao salvar corrida: `fuel_type` e
--      `fuel_quantity` deixam de ser NOT NULL. Desde a 2.1 o abastecimento é um
--      evento separado (`fuel_refuels`) e o formulário não preenche essas colunas.
--   3. Recria RLS, grants e trigger de `updated_at` da tabela nova.
--
-- Nenhuma corrida existente é apagada ou alterada.
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 1. Tipos enumerados
-- -----------------------------------------------------------------------------
do $$
begin
  create type public.pix_key_type as enum (
    'CPF', 'CNPJ', 'EMAIL', 'TELEFONE', 'ALEATORIA'
  );
exception
  when duplicate_object then null;
end $$;

-- -----------------------------------------------------------------------------
-- 2. Perfil do motorista (uma linha por usuário autenticado)
-- -----------------------------------------------------------------------------
create table if not exists public.driver_profiles (
  user_id        uuid primary key references auth.users (id) on delete cascade,
  pix_key_type   public.pix_key_type not null default 'CPF',
  pix_key        text not null,
  merchant_name  text not null,
  merchant_city  text not null default 'BRASIL',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.driver_profiles
  drop constraint if exists driver_profiles_pix_key_not_blank;
alter table public.driver_profiles
  add constraint driver_profiles_pix_key_not_blank
  check (char_length(btrim(pix_key)) between 1 and 77);

alter table public.driver_profiles
  drop constraint if exists driver_profiles_merchant_name_length;
alter table public.driver_profiles
  add constraint driver_profiles_merchant_name_length
  check (char_length(btrim(merchant_name)) between 1 and 25);

alter table public.driver_profiles
  drop constraint if exists driver_profiles_merchant_city_length;
alter table public.driver_profiles
  add constraint driver_profiles_merchant_city_length
  check (char_length(btrim(merchant_city)) between 1 and 15);

comment on table public.driver_profiles is
  'Chave PIX e dados de recebimento de cada motorista (um registro por auth.uid()).';
comment on column public.driver_profiles.pix_key is
  'Chave PIX cadastrada pelo motorista. Aparece no QR Code; não é segredo.';
comment on column public.driver_profiles.merchant_name is
  'Nome exibido no comprovante PIX (até 25 caracteres; acentos são removidos no BR Code).';
comment on column public.driver_profiles.merchant_city is
  'Cidade exibida no comprovante PIX (até 15 caracteres).';

-- Reaproveita a função criada pelo schema.sql; cria quando a instalação veio
-- apenas das migrações antigas.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists driver_profiles_set_updated_at on public.driver_profiles;
create trigger driver_profiles_set_updated_at
  before update on public.driver_profiles
  for each row
  when (old.* is distinct from new.*)
  execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 3. Correção do erro ao salvar corrida
-- -----------------------------------------------------------------------------
-- O formulário 2.1+ envia fuel_cost (parcela rateada), mas não envia mais
-- fuel_type nem fuel_quantity. Exigi-los fazia o insert falhar "vez por outra".
-- Os valores já gravados permanecem intactos; apenas a obrigatoriedade muda.
alter table public.rides
  alter column fuel_type drop not null,
  alter column fuel_quantity drop not null,
  alter column fuel_cost set default 0;

-- CHECK aceita NULL; deixamos a regra explícita para documentar a mudança.
alter table public.rides drop constraint if exists rides_fuel_quantity_positive;
alter table public.rides
  add constraint rides_fuel_quantity_positive
  check (fuel_quantity is null or fuel_quantity > 0);

comment on column public.rides.fuel_type is
  'Legado: tipo do abastecimento migrado da corrida. Opcional desde a 2.2.';
comment on column public.rides.fuel_quantity is
  'Legado: quantidade migrada. Opcional desde a 2.2 (NULL passa no CHECK).';
comment on column public.rides.fuel_cost is
  'Parcela rateada do combustível (R$). Recalculada pelo app a partir de fuel_refuels.';

-- -----------------------------------------------------------------------------
-- 4. RLS — cada motorista acessa somente o próprio perfil
-- -----------------------------------------------------------------------------
alter table public.driver_profiles enable row level security;

drop policy if exists "driver_profiles_select_own" on public.driver_profiles;
drop policy if exists "driver_profiles_insert_own" on public.driver_profiles;
drop policy if exists "driver_profiles_update_own" on public.driver_profiles;
drop policy if exists "driver_profiles_delete_own" on public.driver_profiles;

create policy "driver_profiles_select_own"
  on public.driver_profiles for select to authenticated
  using (auth.uid() = user_id);

create policy "driver_profiles_insert_own"
  on public.driver_profiles for insert to authenticated
  with check (auth.uid() = user_id);

create policy "driver_profiles_update_own"
  on public.driver_profiles for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "driver_profiles_delete_own"
  on public.driver_profiles for delete to authenticated
  using (auth.uid() = user_id);

revoke all on public.driver_profiles from anon;
grant select, insert, update, delete on public.driver_profiles to authenticated;

notify pgrst, 'reload schema';

-- Verificação rápida (opcional):
-- select user_id, pix_key_type, pix_key from public.driver_profiles;
-- select column_name, is_nullable from information_schema.columns
--   where table_name = 'rides' and column_name in ('fuel_type', 'fuel_quantity');
