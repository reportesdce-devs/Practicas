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

export function roleOf(profile: Persona | null): Role | null {
  if (!profile) return null
  if (profile.rol === 'admin' || profile.rol === 'coordinador') return 'coordinador'
  if (profile.tipo === 'Alumno') return 'alumno'
  return null
}
