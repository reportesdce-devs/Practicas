export type EstadoEmpresa = 'no_enviada' | 'enviada' | 'completada' | 'expirada'

export function cartaCompletadaPorEmpresa(datos: unknown): boolean {
  if (!datos || typeof datos !== 'object') return false
  return (datos as { completada_empresa?: unknown }).completada_empresa === true
}

export function correoSupervisorDeCarta(datos: unknown): string | null {
  if (!datos || typeof datos !== 'object') return null
  const correo = (datos as { correoSupervisor?: unknown }).correoSupervisor
  return typeof correo === 'string' && correo.includes('@') ? correo : null
}
