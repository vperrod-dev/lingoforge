import { Component, type ReactNode } from 'react'

interface State {
  hasError: boolean
}

/** Top-level catch-all: without it any uncaught render error blanks the app.
 *  Progress lives in localStorage, so a reload always recovers. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    console.error('lingoforge: uncaught error', error)
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="font-display text-2xl font-bold">Something went wrong</h1>
        <p className="max-w-sm text-sm text-fg-muted">
          Your progress is saved on this device and is not affected. Reload to keep learning.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="clay clay-press bg-primary px-6 py-3 font-bold text-white"
        >
          Reload
        </button>
      </div>
    )
  }
}
