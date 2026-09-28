import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../supabase', async () => {
  const { crearSupabaseMock } = await import('./mockSupabase')
  return { supabase: crearSupabaseMock() }
})

import { buscarProcesoConDocumentos, buscarProcesoPeriodo, periodoActual, type Proceso } from '../procesos'
import { programar, reiniciarMock, registros } from './mockSupabase'

beforeEach(reiniciarMock)

const vigente: Proceso = {
  id: 10,
  folio: 'AB12-CD34-EF56',
  alumno_id: 'al1',
  periodo: '2026-1',
  estado: 'pendiente',
  creado_en: '2026-09-01T00:00:00Z',
}

const respaldo: Proceso = {
  id: 11,
  folio: '1111-2222-3333',
  alumno_id: 'al1',
  periodo: '2026-1',
  estado: 'rechazada',
  creado_en: '2026-08-01T00:00:00Z',
}

function pruebasComunes(buscar: (alumnoId: string) => Promise<unknown>): void {
  it('si hay proceso vigente lo retorna sin correr la consulta de respaldo', async () => {
    programar({ data: vigente, error: null })

    const resultado = await buscar('al1')

    expect(resultado).toEqual(vigente)
    expect(registros).toHaveLength(1)
    expect(registros[0].tabla).toBe('procesos')
    expect(registros[0].metodos.map((m) => m.metodo)).toEqual([
      'select',
      'eq',
      'eq',
      'in',
      'order',
      'limit',
      'maybeSingle',
    ])
  })

  it('filtra por alumno, periodo actual y estados vigentes', async () => {
    programar({ data: vigente, error: null })

    await buscar('al1')

    expect(registros[0].metodos.filter((m) => m.metodo === 'eq')).toEqual([
      { metodo: 'eq', args: ['alumno_id', 'al1'] },
      { metodo: 'eq', args: ['periodo', periodoActual()] },
    ])
    expect(registros[0].metodos).toContainEqual({
      metodo: 'in',
      args: ['estado', ['pendiente', 'aceptada']],
    })
    expect(registros[0].metodos).toContainEqual({
      metodo: 'order',
      args: ['creado_en', { ascending: false }],
    })
    expect(registros[0].metodos).toContainEqual({ metodo: 'limit', args: [1] })
  })

  it('si no hay vigente consulta el respaldo del mismo periodo', async () => {
    programar({ data: null, error: null }, { data: respaldo, error: null })

    const resultado = await buscar('al1')

    expect(resultado).toEqual(respaldo)
    expect(registros).toHaveLength(2)
    expect(registros[1].metodos.map((m) => m.metodo)).toEqual([
      'select',
      'eq',
      'eq',
      'order',
      'limit',
      'maybeSingle',
    ])
  })

  it('sin vigente ni respaldo devuelve null', async () => {
    programar({ data: null, error: null }, { data: null, error: null })

    await expect(buscar('al1')).resolves.toBeNull()
    expect(registros).toHaveLength(2)
  })

  it('si la primera consulta falla lanza sin correr la segunda', async () => {
    programar({ data: null, error: { message: 'boom' } })

    await expect(buscar('al1')).rejects.toThrow('boom')
    expect(registros).toHaveLength(1)
  })
}

describe('buscarProcesoPeriodo', () => {
  pruebasComunes(buscarProcesoPeriodo)

  it('el select trae sólo los campos del proceso', async () => {
    programar({ data: vigente, error: null })

    await buscarProcesoPeriodo('al1')

    const select = registros[0].metodos[0]
    expect(select).toEqual({ metodo: 'select', args: [expect.stringContaining('id, folio')] })
    expect(String(select.args[0])).not.toContain('solicitudes(')
  })
})

describe('buscarProcesoConDocumentos', () => {
  pruebasComunes(buscarProcesoConDocumentos)

  it('el select embebe los documentos del proceso', async () => {
    programar({ data: { ...vigente, solicitudes: [], personas: null }, error: null })

    await buscarProcesoConDocumentos('al1')

    expect(String(registros[0].metodos[0].args[0])).toContain('solicitudes(')
  })
})
