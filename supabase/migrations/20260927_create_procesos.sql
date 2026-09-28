-- ============================================================
-- Migración: tabla de procesos de prácticas (ID de proceso)
-- Un proceso agrupa los 3 documentos: Carta de aceptación,
-- Avance y Cierre. El estado (pendiente/aceptada/rechazada)
-- vive en el proceso, no en cada solicitud.
--
-- Nota: pensada para ejecutarse statement por statement (el
-- SQL Editor la corre así) — sin tablas temporales ni bloques
-- DO, y re-ejecutable de forma segura.
-- Fecha: 2026-09-27
-- ============================================================

begin;

-- ---------------- CREATE TABLE procesos ----------------
create table if not exists public.procesos (
  id        bigint generated always as identity primary key,
  folio     text unique not null default upper(
              substr(md5(random()::text), 1, 4) || '-' ||
              substr(md5(random()::text), 1, 4) || '-' ||
              substr(md5(random()::text), 1, 4)
            ),
  alumno_id text not null references public.personas(id),
  periodo   text not null default (
              to_char(now(), 'YYYY') || '-' ||
              case when extract(month from now()) >= 8 then '2' else '1' end
            ),
  estado    text not null default 'pendiente'
            check (estado in ('pendiente', 'aceptada', 'rechazada')),
  creado_en timestamptz not null default now()
);

-- Máximo 1 proceso vigente (pendiente o aceptado) por alumno y periodo.
-- Los rechazados no cuentan: tras un rechazo el alumno puede abrir otro.
create unique index if not exists procesos_vigente_unico
  on public.procesos (alumno_id, periodo)
  where estado in ('pendiente', 'aceptada');

-- ---------------- solicitudes: ligar a proceso ----------------
alter table public.solicitudes
  add column if not exists proceso_id bigint references public.procesos(id);

-- Paso 1: proceso principal por alumno — la solicitud más reciente de
-- cada documento. Se usa 'pendiente' porque la columna estado ya fue
-- eliminada; la coordinación resuelve desde el panel.
with creados as (
  insert into public.procesos (alumno_id, periodo, estado, creado_en)
  select
    b.alumno_id,
    to_char(max(b.creado_en), 'YYYY') || '-' ||
      case when extract(month from max(b.creado_en)) >= 8 then '2' else '1' end,
    'pendiente',
    min(b.creado_en)
  from (
    select distinct on (alumno_id, documento)
      id, alumno_id, creado_en
    from public.solicitudes
    where proceso_id is null
    order by alumno_id, documento, creado_en desc, id desc
  ) b
  group by b.alumno_id
  returning id, alumno_id
)
update public.solicitudes s
set proceso_id = creados.id
from creados
where creados.alumno_id = s.alumno_id
  and s.proceso_id is null
  and not exists (
    select 1 from public.solicitudes d
    where d.alumno_id = s.alumno_id
      and d.documento = s.documento
      and (d.creado_en, d.id) > (s.creado_en, s.id)
  );

-- Paso 2: solicitudes duplicadas anteriores (rechazadas viejas) — cada
-- una a su propio proceso histórico rechazado, usando folio temporal
-- 'HIST-<id>' como enlace seguro dentro del mismo statement.
with creados as (
  insert into public.procesos (folio, alumno_id, periodo, estado, creado_en)
  select
    'HIST-' || s.id,
    s.alumno_id,
    to_char(s.creado_en, 'YYYY') || '-' ||
      case when extract(month from s.creado_en) >= 8 then '2' else '1' end,
    'rechazada',
    s.creado_en
  from public.solicitudes s
  where s.proceso_id is null
    and exists (
      select 1 from public.solicitudes d
      where d.alumno_id = s.alumno_id
        and d.documento = s.documento
        and (d.creado_en, d.id) > (s.creado_en, s.id)
    )
  returning id, folio
)
update public.solicitudes s
set proceso_id = creados.id
from creados
where creados.folio = 'HIST-' || s.id;

-- Paso 3: reemplazar los folios temporales por folios aleatorios.
-- ('HIST-' no puede colisionar: los folios reales sólo traen dígitos hex.)
update public.procesos
set folio = upper(
  substr(md5(random()::text), 1, 4) || '-' ||
  substr(md5(random()::text), 1, 4) || '-' ||
  substr(md5(random()::text), 1, 4)
)
where folio like 'HIST-%';

alter table public.solicitudes alter column proceso_id set not null;

-- ---------------- el estado sale de solicitudes ----------------
drop index if exists solicitudes_activa_unica;
alter table public.solicitudes drop column if exists estado;

-- Cada documento sólo puede existir 1 vez por proceso
create unique index if not exists solicitudes_unica_por_proceso
  on public.solicitudes (proceso_id, documento);

-- ---------------- RLS procesos ----------------
alter table public.procesos enable row level security;

drop policy if exists procesos_insert_propia on public.procesos;
create policy procesos_insert_propia
  on public.procesos for insert to authenticated
  with check (
    exists (
      select 1 from public.personas p
      where p.correo = auth.jwt() ->> 'email'
        and p.id = alumno_id
        and p.tipo = 'Alumno'
    )
  );

drop policy if exists procesos_select_propios on public.procesos;
create policy procesos_select_propios
  on public.procesos for select to authenticated
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

drop policy if exists procesos_update_coordinador on public.procesos;
create policy procesos_update_coordinador
  on public.procesos for update to authenticated
  using (
    exists (
      select 1 from public.personas p
      where p.correo = auth.jwt() ->> 'email'
        and p.rol in ('admin', 'coordinador')
    )
  );

-- ---------------- RLS solicitudes: sólo a proceso pendiente propio ----------------
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
    and exists (
      select 1 from public.procesos pr
      where pr.id = proceso_id
        and pr.alumno_id = alumno_id
        and pr.estado = 'pendiente'
    )
  );

commit;
