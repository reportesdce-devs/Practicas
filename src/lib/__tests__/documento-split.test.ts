import { describe, expect, it } from 'vitest'
import { complementoEmpresaSchema, solicitudCartaAlumnoSchema } from '../schemas/documento'

const cartaValida = {
  empresa: 'ACME SA de CV',
  lugar: 'Altamira, Tamaulipas',
  supervisor: 'Ing. Andrea Morales',
  puestoSupervisor: 'Líder de Proyectos',
  correoSupervisor: 'supervisor@empresa.com',
  actividades: [{ valor: 'Desarrollo de soluciones digitales' }],
}

const empresaValida = {
  giro: 'Servicios digitales',
  tipoOrganizacion: 'Privada',
  tamano: 'Mediana',
  fechaInicio: '2026-10-01',
  horarioInicio: '09:00',
  horarioFin: '14:00',
  dias: 'lunes a viernes',
  directivo: 'Lic. Roberto Martínez',
}

describe('solicitudCartaAlumnoSchema', () => {
  it('acepta la carta mínima del alumno', () => {
    expect(() => solicitudCartaAlumnoSchema.parse(cartaValida)).not.toThrow()
  })

  it('exige el correo del supervisor', () => {
    const resultado = solicitudCartaAlumnoSchema.safeParse({ ...cartaValida, correoSupervisor: 'no-es-correo' })
    expect(resultado.success).toBe(false)
  })
})

describe('complementoEmpresaSchema', () => {
  it('acepta el complemento de la empresa', () => {
    expect(() => complementoEmpresaSchema.parse(empresaValida)).not.toThrow()
  })

  it('rechaza salida anterior o igual a la entrada', () => {
    const resultado = complementoEmpresaSchema.safeParse({ ...empresaValida, horarioFin: '09:00' })
    expect(resultado.success).toBe(false)
  })
})
