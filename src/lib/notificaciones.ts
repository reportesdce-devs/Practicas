const RUTA_AVISO_FOLIO = '/api/enviar-folio'

export async function avisarNuevoProceso(folio: string): Promise<void> {
  const respuesta = await fetch(RUTA_AVISO_FOLIO, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folio }),
  })

  if (!respuesta.ok) {
    throw new Error(`El aviso del folio falló (HTTP ${respuesta.status})`)
  }
}
