import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import PantallaEstado from './PantallaEstado'

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
      <div className="flex min-h-dvh items-center justify-center bg-paper px-5">
        <PantallaEstado
          icono="fa-solid fa-triangle-exclamation"
          tono="danger"
          titulo="Algo salió mal"
          descripcion="Ocurrió un error inesperado. Puedes intentar de nuevo o recargar la página."
        >
          <pre className="max-h-40 overflow-auto rounded-lg bg-ink/5 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-ink/60">
            {error.message}
          </pre>
          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" className="btn btn-primary" onClick={this.reiniciar}>
              <i className="fa-solid fa-rotate-right" aria-hidden="true" />
              Reintentar
            </button>
            <button type="button" className="btn btn-outline" onClick={() => window.location.reload()}>
              <i className="fa-solid fa-arrows-rotate" aria-hidden="true" />
              Recargar
            </button>
          </div>
          <Link to="/" className="btn btn-ghost btn-block">
            Ir al inicio
          </Link>
        </PantallaEstado>
      </div>
    )
  }
}