import { Component } from 'react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary capturó:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-full items-center justify-center bg-slate-100 p-6">
          <div className="w-full max-w-lg space-y-3 rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
            <h1 className="text-base font-bold text-red-800">Ocurrió un error al mostrar la pantalla</h1>
            <p className="rounded-lg bg-red-50 p-3 font-mono text-xs text-red-900">
              {this.state.error?.message || String(this.state.error)}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
              >
                Recargar página
              </button>
              <button
                type="button"
                onClick={() => {
                  localStorage.clear();
                  window.location.href = '/login';
                }}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Ir a Login
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
