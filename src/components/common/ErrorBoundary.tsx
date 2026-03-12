import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="bento-card" style={{ padding: '24px', textAlign: 'center', border: '1px dashed var(--border)' }}>
          <h2 style={{ color: 'var(--danger)', marginBottom: '8px' }}>Algo salió mal</h2>
          <p className="muted">Hubo un error al cargar este componente.</p>
          <button 
            onClick={() => this.setState({ hasError: false })}
            style={{ 
              marginTop: '16px', 
              padding: '8px 16px', 
              borderRadius: '8px', 
              background: 'var(--accent)', 
              color: '#fff',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Reintentar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
