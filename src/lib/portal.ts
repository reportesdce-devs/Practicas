import type { Role } from './types'

const CLAVE = 'portal-activo'

export function portalGuardado(): Role | null {
  if (typeof window === 'undefined') return null
  const valor = window.sessionStorage.getItem(CLAVE)
  return valor === 'alumno' || valor === 'coordinador' ? valor : null
}

export function guardarPortal(rol: Role): void {
  window.sessionStorage.setItem(CLAVE, rol)
}

export function limpiarPortal(): void {
  window.sessionStorage.removeItem(CLAVE)
}

export const HOME_POR_ROLE: Record<Role, string> = {
  alumno: '/alumno/documentos',
  coordinador: '/coordinador',
}