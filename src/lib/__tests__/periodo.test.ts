import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../supabase', () => ({ supabase: {} }))

import { periodoActual } from '../procesos'

afterEach(() => {
  vi.useRealTimers()
})

describe('periodoActual', () => {
  it('enero cae en el semestre 1', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 0, 15))
    expect(periodoActual()).toBe('2026-1')
  })

  it('julio sigue siendo semestre 1 (borde del mes 7)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 31, 23, 59))
    expect(periodoActual()).toBe('2026-1')
  })

  it('agosto inicia el semestre 2 (borde del mes 8)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 1, 0, 0))
    expect(periodoActual()).toBe('2026-2')
  })

  it('septiembre es semestre 2', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 10))
    expect(periodoActual()).toBe('2026-2')
  })

  it('diciembre cierra el semestre 2', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 11, 31, 23, 59))
    expect(periodoActual()).toBe('2026-2')
  })

  it('el año nuevo reinicia en -1 con el año actual', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2027, 0, 1, 0, 0))
    expect(periodoActual()).toBe('2027-1')
  })
})
