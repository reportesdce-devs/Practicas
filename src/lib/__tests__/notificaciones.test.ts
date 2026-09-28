import { afterEach, describe, expect, it, vi } from 'vitest'
import { avisarNuevoProceso } from '../notificaciones'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('avisarNuevoProceso', () => {
  it('hace un POST a la función con el folio', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await avisarNuevoProceso('AB12-CD34-EF56')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith('/api/enviar-folio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folio: 'AB12-CD34-EF56' }),
    })
  })

  it('lanza error si la función responde con fallo', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 500 })))

    await expect(avisarNuevoProceso('AB12-CD34-EF56')).rejects.toThrow('HTTP 500')
  })

  it('lanza error si la red no responde', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('red caída')))

    await expect(avisarNuevoProceso('AB12-CD34-EF56')).rejects.toThrow('red caída')
  })
})
