-- ============================================================
-- Migración: flujo de empresa para la carta de aceptación
-- Fecha: 2026-09-30
-- ============================================================
-- El alumno registra la carta mínima (empresa, lugar, supervisor,
-- correo del supervisor y actividades). La empresa completa giro,
-- tamaño, fechas, horarios y directivo con un enlace temporal.
-- La confirmación del coordinador solo envía el enlace; la
-- aceptación final sigue separada y requiere carta completa.
--
-- Nota: ejecutar statement por statement (SQL Editor), sin DO ni
-- tablas temporales; re-ejecutable con seguridad.
-- ============================================================

begin;

-- ---------------- procesos: estado de empresa ----------------
alter table public.procesos
  add column if not exists empresa_correo text;

alter table public.procesos
  add column if not exists empresa_estado text not null default 'no_enviada';

alter table public.procesos
  add column if not exists empresa_expira_en timestamptz;

alter table public.procesos
  add column if not exists empresa_completada_en timestamptz;

-- ---------------- invitaciones de empresa ----------------
create table if not exists public.empresa_invitaciones (
  id            bigint generated always as identity primary key,
  proceso_id    bigint not null references public.procesos(id) on delete cascade,
  solicitud_id  bigint not null references public.solicitudes(id) on delete cascade,
  correo_empresa text not null,
  token_sha256  text not null unique,
  expira_en     timestamptz not null,
  usada_en      timestamptz,
  revocada_en   timestamptz,
  creada_en     timestamptz not null default now()
);

create index if not exists empresa_invitaciones_proceso_idx
  on public.empresa_invitaciones (proceso_id);

create index if not exists empresa_invitaciones_expira_idx
  on public.empresa_invitaciones (expira_en);

alter table public.empresa_invitaciones enable row level security;

-- Sin policies: solo service_role (funciones) lee/escribe invitaciones.
-- RLS deniega anon/authenticated por defecto.

-- ---------------- backfill: cartas completas del flujo anterior ----------------
update public.solicitudes
set datos = datos || '{"origen":"alumno","completada_empresa":true}'::jsonb
where documento = 'carta_aceptacion'
  and (datos ->> 'giro') is not null
  and (datos ->> 'giro') <> ''
  and coalesce((datos ->> 'completada_empresa')::boolean, false) = false;

update public.procesos p
set empresa_estado = 'completada',
    empresa_completada_en = coalesce(p.empresa_completada_en, now())
where exists (
  select 1 from public.solicitudes s
  where s.proceso_id = p.id
    and s.documento = 'carta_aceptacion'
    and (s.datos ->> 'giro') is not null
    and (s.datos ->> 'giro') <> ''
);

-- ---------------- procesos: INSERT solo alumno propio, sin estado empresa forjado ----------------
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
    and estado = 'pendiente'
    and folio ~ '^[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$'
    and periodo in (
      to_char(now(), 'YYYY') || '-' ||
        case when extract(month from now()) >= 8 then '2' else '1' end,
      to_char(now() - interval '8 hours', 'YYYY') || '-' ||
        case when extract(month from now() - interval '8 hours') >= 8 then '2' else '1' end
    )
    and empresa_estado = 'no_enviada'
    and empresa_correo is null
    and empresa_expira_en is null
    and empresa_completada_en is null
  );

-- ---------------- solicitudes: avance/cierre solo con carta completada ----------------
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
        and pr.periodo in (
          to_char(now(), 'YYYY') || '-' ||
            case when extract(month from now()) >= 8 then '2' else '1' end,
          to_char(now() - interval '8 hours', 'YYYY') || '-' ||
            case when extract(month from now() - interval '8 hours') >= 8 then '2' else '1' end
        )
        and (
          documento = 'carta_aceptacion'
          or pr.empresa_estado = 'completada'
        )
    )
    and documento in ('carta_aceptacion', 'avance', 'cierre')
    and jsonb_typeof(datos) = 'object'
    and pg_column_size(datos) <= 50000
  );

commit;
