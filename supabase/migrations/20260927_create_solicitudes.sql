-- ============================================================
-- Migración: tabla de solicitudes de documentos
-- Fecha: 2026-09-27
-- ============================================================

begin;

-- ---------------- CREATE TABLE solicitudes ----------------
create table if not exists public.solicitudes (
  id         bigint generated always as identity primary key,
  alumno_id  text not null references public.personas(id),
  documento  text not null,
  estado     text not null default 'pendiente'
             check (estado in ('pendiente', 'aceptada', 'rechazada')),
  datos      jsonb not null default '{}'::jsonb,
  creado_en  timestamptz not null default now()
);

-- Solo puede existir 1 solicitud activa (pendiente o aceptada)
-- por alumno y documento. Las rechazadas no cuentan: el alumno
-- puede volver a solicitar después de un rechazo.
create unique index if not exists solicitudes_activa_unica
  on public.solicitudes (alumno_id, documento)
  where estado in ('pendiente', 'aceptada');

-- ---------------- RLS ----------------
alter table public.solicitudes enable row level security;

drop policy if exists solicitudes_insert_propia on public.solicitudes;
create policy solicitudes_insert_propia
  on public.solicitudes for insert to authenticated
  with check (
    exists (
      select 1 from public.personas p
      where p.correo = auth.jwt() ->> 'email'
        and p.id = alumno_id
        and p.tipo = 'Alumno'
    )
  );

drop policy if exists solicitudes_select_propias on public.solicitudes;
create policy solicitudes_select_propias
  on public.solicitudes for select to authenticated
  using (
    exists (
      select 1 from public.personas p
      where p.correo = auth.jwt() ->> 'email'
        and p.id = alumno_id
    )
    or exists (
      select 1 from public.personas p
      where p.correo = auth.jwt() ->> 'email'
        and p.rol in ('admin', 'coordinador')
    )
  );

drop policy if exists solicitudes_update_coordinador on public.solicitudes;
create policy solicitudes_update_coordinador
  on public.solicitudes for update to authenticated
  using (
    exists (
      select 1 from public.personas p
      where p.correo = auth.jwt() ->> 'email'
        and p.rol in ('admin', 'coordinador')
    )
  );

commit;
