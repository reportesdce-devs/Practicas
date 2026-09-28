-- ============================================================
-- Migración: cerrar lectura anónima de la tabla personas
-- Fecha: 2026-09-27
-- ============================================================
-- Hallazgo: con la anon key (pública, embebida en el frontend)
-- cualquier visitante podía descargar las 666 filas de personas
-- (nombre, correo, matrícula, carrera) sin iniciar sesión.
-- Existía una política de SELECT permisiva para roles sin sesión.
--
-- Solución: eliminar todas las políticas de personas y crear
-- una que solo permita leer:
--   * la fila propia (coincide el correo del JWT), o
--   * todas las filas si el usuario es admin/coordinador.
-- La app solo lee personas DESPUÉS del login, por lo que nada
-- deja de funcionar: fetchProfile (fila propia), panel del
-- coordinador (todas) y las políticas de solicitudes (subconsultas
-- sobre la fila propia) siguen cumpliendo.
--
-- Nota: la función es SECURITY DEFINER para evitar la recursión
-- infinita que causaría una política de personas que consulta
-- personas.

begin;

-- 1. Eliminar cualquier política existente de personas
--    (incluida la que habilitaba lectura sin sesión).
do $$
declare pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'personas'
  loop
    execute format('drop policy %I on public.personas', pol.policyname);
  end loop;
end $$;

-- 2. Helper sin recursión: ¿el usuario actual es admin/coordinador?
create or replace function public.es_admin_o_coordinador()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.personas
    where correo = auth.jwt() ->> 'email'
      and rol in ('admin', 'coordinador')
  );
$$;

revoke execute on function public.es_admin_o_coordinador() from public, anon;
grant execute on function public.es_admin_o_coordinador() to authenticated;

-- 3. RLS: cada quien su propia fila; coordinadores/admin, todas.
alter table public.personas enable row level security;

create policy personas_select_propia_o_coordinador
  on public.personas for select to authenticated
  using (
    correo = auth.jwt() ->> 'email'
    or public.es_admin_o_coordinador()
  );

commit;
