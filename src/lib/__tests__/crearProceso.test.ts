import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../supabase', async () => {
  const { crearSupabaseMock } = await import('./mockSupabase')
  return { supabase: crearSupabaseMock() }
})

import { crearProceso, periodoActual, type Proceso } from '../procesos'
import { crearSolicitud } from '../solicitudes'
import { programar, reiniciarMock, registros } from './mockSupabase'

beforeEach(reiniciarMock)

const proceso = (extra: Partial<Proceso> = {}): Proceso => ({
  id: 10,
  folio: 'AB12-CD34-EF56',
  alumno_id: 'al1',
  periodo: periodoActual(),
  estado: 'pendiente',
  creado_en: '2026-09-01T00:00:00Z',
  empresa_correo: null,
  empresa_estado: 'no_enviada',
  empresa_expira_en: null,
  empresa_completada_en: null,
  ...extra,
})

const err = (code: string, message = 'error de postgres') => ({
  data: null,
  error: { code, message },
})

const vacio = { data: null, error: null }

describe('crearProceso', () => {
  it('retorna el proceso pendiente existente sin insertar', async () => {
    programar({ data: proceso(), error: null })

    const resultado = await crearProceso('al1')

    expect(resultado.folio).toBe('AB12-CD34-EF56')
    expect(registros).toHaveLength(1)
    expect(registros[0].metodos.some((m) => m.metodo === 'insert')).toBe(false)
  })

  it('rechaza si el proceso vigente ya fue aceptado', async () => {
    programar({ data: proceso({ estado: 'aceptada' }), error: null })

    await expect(crearProceso('al1')).rejects.toThrow('ya fue aceptado')
    expect(registros).toHaveLength(1)
  })

  it('inserta un proceso nuevo del periodo actual cuando no existe', async () => {
    programar(vacio, vacio, { data: proceso(), error: null })

    const resultado = await crearProceso('al1')

    expect(resultado).toEqual(proceso())
    expect(registros).toHaveLength(3)
    expect(registros[2].tabla).toBe('procesos')
    expect(registros[2].metodos).toEqual([
      { metodo: 'insert', args: [{ alumno_id: 'al1', periodo: periodoActual() }] },
      { metodo: 'select', args: [expect.stringContaining('id, folio')] },
      { metodo: 'single', args: [] },
    ])
  })

  it('ante un 23505 reintenta y termina bien', async () => {
    programar(vacio, vacio, err('23505'), vacio, vacio, { data: proceso(), error: null })

    const resultado = await crearProceso('al1')

    expect(resultado).toEqual(proceso())
    expect(registros).toHaveLength(6)
    expect(
      registros.filter((r) => r.metodos.some((m) => m.metodo === 'insert')),
    ).toHaveLength(2)
  })

  it('tras 3 intentos fallidos lanza el error de reintento', async () => {
    programar(
      vacio,
      vacio,
      err('23505'),
      vacio,
      vacio,
      err('23505'),
      vacio,
      vacio,
      err('23505'),
    )

    await expect(crearProceso('al1')).rejects.toThrow('No se pudo crear el proceso')
    expect(registros).toHaveLength(9)
  })

  it('un 42501 se traduce en mensaje de permisos', async () => {
    programar(vacio, vacio, err('42501', 'row-level security'))

    await expect(crearProceso('al1')).rejects.toThrow(
      'No tienes permisos para crear un proceso',
    )
  })

  it('un error genérico propaga el mensaje original', async () => {
    programar(vacio, vacio, { data: null, error: { message: 'algo raro' } })

    await expect(crearProceso('al1')).rejects.toThrow('algo raro')
  })
})

describe('crearSolicitud', () => {
  const datos = { empresa: 'ACME', fecha_inicio: '2026-09-01' }
  const cartaCompleta = {
    data: { datos: { completada_empresa: true }, creado_en: '2026-09-01T00:00:00Z' },
    error: null,
  }
  const cartaPendienteEmpresa = {
    data: { datos: { completada_empresa: false }, creado_en: '2026-09-01T00:00:00Z' },
    error: null,
  }

  it('inserta el documento en el proceso pendiente y retorna el folio', async () => {
    programar({ data: proceso(), error: null }, cartaCompleta, vacio)

    const folio = await crearSolicitud('al1', 'avance', datos)

    expect(folio).toBe('AB12-CD34-EF56')
    expect(registros).toHaveLength(3)
    expect(registros[2].tabla).toBe('solicitudes')
    expect(registros[2].metodos).toEqual([
      {
        metodo: 'insert',
        args: [{ alumno_id: 'al1', proceso_id: 10, documento: 'avance', datos }],
      },
    ])
  })

  it('no permite documentos si el proceso ya fue aceptado', async () => {
    programar({ data: proceso({ estado: 'aceptada' }), error: null })

    await expect(crearSolicitud('al1', 'avance', datos)).rejects.toThrow('ya fue aceptado')
    expect(registros).toHaveLength(1)
    expect(registros[0].tabla).toBe('procesos')
  })

  it('exige la carta primero para abrir un proceso nuevo', async () => {
    programar(vacio, vacio)

    await expect(crearSolicitud('al1', 'avance', datos)).rejects.toThrow(
      'Primero solicita la carta',
    )
    expect(registros).toHaveLength(2)
    expect(registros.some((r) => r.tabla === 'solicitudes')).toBe(false)
  })

  it('bloquea avance o cierre si la empresa no ha completado la carta', async () => {
    programar({ data: proceso(), error: null }, cartaPendienteEmpresa)

    await expect(crearSolicitud('al1', 'cierre', datos)).rejects.toThrow(
      'completada por la empresa',
    )
    expect(registros).toHaveLength(2)
    expect(
      registros.some((r) =>
        r.tabla === 'solicitudes' && r.metodos.some((m) => m.metodo === 'insert'),
      ),
    ).toBe(false)
  })

  it('con la carta crea el proceso y luego inserta el documento', async () => {
    programar(vacio, vacio, vacio, vacio, { data: proceso(), error: null }, vacio)

    const folio = await crearSolicitud('al1', 'carta_aceptacion', datos)

    expect(folio).toBe('AB12-CD34-EF56')
    expect(registros).toHaveLength(6)
    expect(registros[4].tabla).toBe('procesos')
    expect(registros[5].tabla).toBe('solicitudes')
  })

  it('un 23505 en la solicitud indica documento duplicado', async () => {
    programar({ data: proceso(), error: null }, cartaCompleta, err('23505'))

    await expect(crearSolicitud('al1', 'avance', datos)).rejects.toThrow(
      'Ya solicitaste este documento en tu proceso actual',
    )
  })

  it('un 42501 en la solicitud indica falta de permisos', async () => {
    programar({ data: proceso(), error: null }, cartaCompleta, err('42501', 'row-level security'))

    await expect(crearSolicitud('al1', 'avance', datos)).rejects.toThrow(
      'No tienes permisos para enviar este documento',
    )
  })
})
