-- =============================================================================
-- RotaRendaComLucro 2.3 — fuel_type opcional em rides
-- =============================================================================
-- COMO USAR
--   Supabase Dashboard → SQL Editor → New query → cole TODO este arquivo → Run.
--   Pode ser executado quantas vezes quiser (idempotente).
--
-- PROBLEMA
--   Ao salvar uma corrida o app não envia `fuel_type` (o tipo de combustível
--   é registrado separadamente em `fuel_refuels`). Como a coluna era NOT NULL,
--   o Postgres recusava o insert:
--     null value in column "fuel_type" of relation "rides" violates not-null
--     constraint
--
-- CORREÇÃO
--   Tornar `rides.fuel_type` opcional. `fuel_refuels.fuel_type` continua NOT
--   NULL, pois todo abastecimento precisa do tipo. Nenhuma corrida é apagada.
-- =============================================================================

alter table public.rides
  alter column fuel_type drop not null;

comment on column public.rides.fuel_type is
  'Legado/opcional: tipo de combustível da corrida. O app registra o tipo em fuel_refuels.';

notify pgrst, 'reload schema';

-- Verificação rápida (opcional):
-- select column_name, is_nullable
-- from information_schema.columns
-- where table_schema = 'public' and table_name = 'rides' and column_name = 'fuel_type';
-- -- is_nullable deve retornar YES
