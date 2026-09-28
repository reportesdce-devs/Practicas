export const DOCUMENTOS = [
  {
    codigo: 'carta_aceptacion',
    titulo: 'Carta de aceptación',
    href: '/alumno/solicitud/carta-aceptacion',
    descripcion: 'Solicitud de carta para la empresa donde realizarás tus prácticas.',
  },
  {
    codigo: 'avance',
    titulo: 'Avance',
    href: '/alumno/solicitud/avance',
    descripcion: 'Solicitud de constancia de avance de tus prácticas.',
  },
  {
    codigo: 'cierre',
    titulo: 'Cierre',
    href: '/alumno/solicitud/cierre',
    descripcion: 'Solicitud de constancia de cierre de tus prácticas.',
  },
] as const

export type CodigoDocumento = (typeof DOCUMENTOS)[number]['codigo']

export function etiquetaDocumento(codigo: string): string {
  return DOCUMENTOS.find((doc) => doc.codigo === codigo)?.titulo ?? codigo
}

export function ordenDocumento(codigo: string): number {
  const indice = DOCUMENTOS.findIndex((doc) => doc.codigo === codigo)
  return indice === -1 ? DOCUMENTOS.length : indice
}
