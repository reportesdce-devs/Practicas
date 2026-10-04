import { describe, expect, it } from 'vitest'
import { rolesOf, type Persona } from '../types'

function persona(parcial: Partial<Persona>): Persona {
  return {
    id: '123',
    nombre: 'Alumno Demo',
    tipo: 'Alumno',
    rol: null,
    correo: 'a@iest.edu.mx',
    carrera_id: 1,
    carreras: null,
    ...parcial,
  }
}

describe('rolesOf', () => {
  it('devuelve [] sin perfil', () => {
    expect(rolesOf(null)).toEqual([])
  })

  it('devuelve alumno si tipo es Alumno', () => {
    expect(rolesOf(persona({}))).toEqual(['alumno'])
  })

  it('devuelve coordinador si rol es coordinador', () => {
    expect(rolesOf(persona({ tipo: '', rol: 'coordinador' }))).toEqual(['coordinador'])
  })

  it('devuelve coordinador si rol es admin', () => {
    expect(rolesOf(persona({ tipo: '', rol: 'admin' }))).toEqual(['coordinador'])
  })

  it('devuelve ambos roles si tipo Alumno y rol coordinador', () => {
    expect(rolesOf(persona({ rol: 'coordinador' }))).toEqual(['coordinador', 'alumno'])
  })

  it('devuelve [] si no hay rol ni tipo alumno', () => {
    expect(rolesOf(persona({ tipo: 'Docente', rol: null }))).toEqual([])
  })
})