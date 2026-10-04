export type Carrera = {
  nombre: string
  sigla: string | null
}

export type Persona = {
  id: string
  nombre: string
  tipo: string
  rol: 'admin' | 'coordinador' | null
  correo: string | null
  carrera_id: number | null
  carreras: Carrera | null
}

export type Role = 'alumno' | 'coordinador'

export function rolesOf(profile: Persona | null): Role[] {
  if (!profile) return []
  const roles: Role[] = []
  if (profile.rol === 'admin' || profile.rol === 'coordinador') roles.push('coordinador')
  if (profile.tipo === 'Alumno') roles.push('alumno')
  return roles
}

export function roleOf(profile: Persona | null): Role | null {
  return rolesOf(profile)[0] ?? null
}
