import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('ErrorBoundary capturó un error:', error, info.componentStack)
  }

  private reiniciar = (): void => {
    this.setState({ error: null })
  }

  render(): ReactNode {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-5">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <span className="mx-auto grid h-11 w-[56px] place-items-center rounded-lg bg-brand text-sm font-black text-white">
            ISND
          </span>
          <h1 className="mt-4 text-lg font-bold text-red-700">Algo salió mal</h1>
          <p className="mt-2 text-sm text-gray-600">
            Ocurrió un error inesperado. Puedes intentar de nuevo o recargar la página.
          </p>
          <p className="mt-3 break-words rounded-lg bg-gray-50 px-3 py-2 text-left text-xs text-gray-500">
            {error.message}
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <button
              type="button"
              onClick={this.reiniciar}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              Reintentar
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Recargar
            </button>
          </div>
          <Link to="/" className="mt-4 block text-xs text-gray-400 hover:text-gray-600">
            Ir al inicio
          </Link>
        </div>
      </div>
    )
  }
}
