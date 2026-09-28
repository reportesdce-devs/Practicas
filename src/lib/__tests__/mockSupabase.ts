// Helper de tests: doble del cliente Supabase.
//
// El cliente real encadena builders (.from().select().eq()...maybeSingle()).
// Este mock devuelve el mismo encadenamiento, registrando cada método
// llamado en `registros`, y resuelve los terminales (maybeSingle/single/
// await directo) con la cola de resultados que el test programa antes
// de invocar la función bajo prueba.
//
// Los archivos *.test.ts lo instalan con:
//   vi.mock('../supabase', async () => {
//     const { crearSupabaseMock } = await import('./mockSupabase')
//     return { supabase: crearSupabaseMock() }
//   })

export interface ResultadoConsulta {
  data?: unknown
  error?: { code?: string; message: string } | null
}

export interface RegistroConsulta {
  tabla: string
  metodos: { metodo: string; args: unknown[] }[]
}

export const registros: RegistroConsulta[] = []
const cola: ResultadoConsulta[] = []

export function programar(...resultados: ResultadoConsulta[]): void {
  cola.push(...resultados)
}

export function reiniciarMock(): void {
  registros.length = 0
  cola.length = 0
}

function siguienteResultado(tabla: string): ResultadoConsulta {
  const resultado = cola.shift()
  if (!resultado) {
    throw new Error(`mockSupabase: no hay resultado programado para la consulta en "${tabla}"`)
  }
  return resultado
}

function crearBuilder(tabla: string) {
  const registro: RegistroConsulta = { tabla, metodos: [] }
  registros.push(registro)

  const encadenable =
    (metodo: string) =>
    (...args: unknown[]) => {
      registro.metodos.push({ metodo, args })
      return builder
    }

  const terminal =
    (metodo: string) =>
    (): Promise<ResultadoConsulta> => {
      registro.metodos.push({ metodo, args: [] })
      return Promise.resolve(siguienteResultado(tabla))
    }

  const builder = {
    select: encadenable('select'),
    eq: encadenable('eq'),
    in: encadenable('in'),
    order: encadenable('order'),
    limit: encadenable('limit'),
    insert: encadenable('insert'),
    update: encadenable('update'),
    maybeSingle: terminal('maybeSingle'),
    single: terminal('single'),
    then: (
      onfulfilled?: ((value: ResultadoConsulta) => unknown) | null,
      onrejected?: ((reason: unknown) => unknown) | null,
    ): Promise<unknown> =>
      Promise.resolve(siguienteResultado(tabla)).then(onfulfilled, onrejected),
  }

  return builder
}

export function crearSupabaseMock() {
  return {
    from: (tabla: string) => crearBuilder(tabla),
  }
}
