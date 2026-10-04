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
      <div className="gate-shell">
        <div className="app">
          <div className="card gate-card">
            <div className="gate-head">
              <img className="gate-logo" src="/logo-dce.png" alt="Logo de Ingenierías" />
            </div>
            <div className="gate-body">
              <div className="gate-title" style={{ marginBottom: 14 }}>
                <h1>Algo salió mal</h1>
                <p>Prácticas profesionales</p>
              </div>
              <div className="alert alert-danger">
                <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
                <span>Ocurrió un error inesperado. Puedes intentar de nuevo o recargar la página.</span>
              </div>
              <p
                className="error"
                style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'var(--font-mono)' }}
              >
                {error.message}
              </p>
              <div className="field" style={{ display: 'flex', gap: 10 }}>
                <button type="button" className="btn btn-primary" onClick={this.reiniciar}>
                  <i className="fa-solid fa-rotate-right" aria-hidden="true" />
                  Reintentar
                </button>
                <button type="button" className="btn" onClick={() => window.location.reload()}>
                  <i className="fa-solid fa-arrows-rotate" aria-hidden="true" />
                  Recargar
                </button>
              </div>
              <Link to="/" className="btn btn-ghost btn-block" style={{ marginTop: 12 }}>
                Ir al inicio
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }
}