-- ============================================================
-- Migración: endurecer políticas INSERT de procesos y solicitudes
-- Fecha: 2026-09-27
-- ============================================================
-- Hallazgos de la auditoría (lectura de políticas):
--   * procesos INSERT no validaba estado/periodo/folio: un alumno
--     malicioso podía crear un proceso con estado 'aceptada'
--     (falsificar aceptación), con periodo falso tipo '1999-1'
--     (ilimitados, esquivando el candado de "ya aceptado") o con
--     folio a elección.
--   * solicitudes INSERT no validaba el código de documento ni el
--     tamaño/tipo de datos: se podían inventar documentos y meter
--     payloads enormes.
--   * existía una política UPDATE de solicitudes que la app no usa
--     (el estado vive en procesos): superficie de escritura que se
--     elimina.
--
-- Sobre el periodo: la app genera el periodo con el reloj local
-- (México, UTC-5 a UTC-8) y el servidor con UTC, así que en el
-- cambio de periodo (1-ago / 1-ene) pueden diferir unas horas.
-- Se aceptan los dos valores posibles (ahora y hace 8 h) para
-- cubrir cualquier zona del país sin abrir una ventana de ataque
-- real (sólo un periodo contiguo, 8 veces al año y por horas).
--
-- Nota: ejecutar statement por statement (SQL Editor), sin DO ni
-- tablas temporales; re-ejecutable con seguridad.
-- ============================================================

begin;

-- ---------------- procesos: INSERT sólo alumno propio, vigente ----------------
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
  );

-- ---------------- solicitudes: INSERT sólo en proceso vigente propio ----------------
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
    )
    and documento in ('carta_aceptacion', 'avance', 'cierre')
    and jsonb_typeof(datos) = 'object'
    and pg_column_size(datos) <= 50000
  );

-- ---------------- eliminar la política UPDATE de solicitudes que no se usa ----------------
-- La app nunca escribe en solicitudes (el estado vive en procesos y
-- sólo la coordinación lo cambia). Sin política, no hay escritura.
drop policy if exists solicitudes_update_coordinador on public.solicitudes;

commit;
