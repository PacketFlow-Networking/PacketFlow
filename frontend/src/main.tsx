import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './styles/globals.css'
import { ToastProvider } from './context/ToastContext'

// Simple error boundary
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('React Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          backgroundColor: '#0B1220',
          color: '#E5E7EB',
          padding: '2rem',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#EF4444' }}>
             Application Error
          </h1>
          <p style={{ marginBottom: '1rem', color: '#9CA3AF' }}>
            Something went wrong. Check the console for details.
          </p>
          <pre style={{
            backgroundColor: '#111827',
            padding: '1rem',
            borderRadius: '0.5rem',
            maxWidth: '600px',
            overflow: 'auto',
            fontSize: '0.875rem',
            border: '1px solid #374151'
          }}>
            {this.state.error?.toString()}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              backgroundColor: '#38BDF8',
              color: '#0B1220',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
