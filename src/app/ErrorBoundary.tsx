import { Component, type ReactNode } from 'react'

export interface ErrorBoundaryFallbackProps {
  error: Error
  resetError: () => void
}

export interface ErrorBoundaryProps {
  children: ReactNode
  /** Optional additional fallback renderer; receives the error + reset fn. */
  fallback?: (props: ErrorBoundaryFallbackProps) => ReactNode
  /** Context used for logging (default "lingoforge"). */
  context?: string
}

export interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/** Local logger shim so error logging is centralized and replaceable. */
function logLocalError(context: string, error: Error) {
  const payload = {
    context,
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
  }
  // Local-first: never exfiltrate. Console plus a dedicated localStorage key for inspection.
  try {
    console.error(`[${context}]`, payload)
  } catch {
    // ignore logging failures
  }
  try {
    const key = '__lingoforge_error_log'
    const raw = localStorage.getItem(key)
    const arr = raw ? JSON.parse(raw) : []
    arr.push(payload)
    localStorage.setItem(key, JSON.stringify(arr.slice(-100)))
  } catch {
    // quota / private mode should never crash the boundary itself
  }
}

/** Catching render-time and lifecycle errors within a subtree.
 *
 *  Acceptance criteria covered here:
 *  - typed props/state; React 19 class component API compatible with project React version
 *  - graceful app-themed fallback with retry
 *  - logs to local system only
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error) {
    const context = this.props.context ?? 'lingoforge'
    logLocalError(context, error)
  }

  resetError = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    const { children, fallback } = this.props
    if (!this.state.hasError || !this.state.error) {
      return children
    }

    if (fallback) {
      return fallback({ error: this.state.error, resetError: this.resetError })
    }

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="font-display text-2xl font-bold text-fg">Something went wrong</h1>
        <p className="max-w-sm text-sm text-fg-muted">
          Your progress is saved on this device and is not affected. You can keep learning after retrying.
        </p>
        <p className="hidden text-xs text-fg-muted md:block">{this.state.error.message}</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={this.resetError}
            className="clay clay-press bg-primary px-6 py-3 font-bold text-on-primary"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="clay clay-press bg-surface px-6 py-3 font-bold text-fg"
          >
            Reload
          </button>
        </div>
      </div>
    )
  }
}
