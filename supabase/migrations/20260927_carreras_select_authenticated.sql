-- ============================================================
-- Migración: permitir lectura de carreras a usuarios autenticados
-- Fecha: 2026-09-27
-- ============================================================
-- La tabla carreras tenía RLS activo sin ninguna política de
-- SELECT, por lo que los embeds (personas -> carreras) que usa
-- la app devolvían null y la carrera aparecía como "—".
-- Datos de referencia de solo lectura: se habilita a cualquier
-- usuario autenticado (alumnos y coordinadores).

begin;

alter table public.carreras enable row level security;

drop policy if exists carreras_select_authenticated on public.carreras;
create policy carreras_select_authenticated
  on public.carreras for select to authenticated
  using (true);

commit;
