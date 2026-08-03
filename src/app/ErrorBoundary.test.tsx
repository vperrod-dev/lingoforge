import type { ReactElement } from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ErrorBoundary, type ErrorBoundaryFallbackProps } from './ErrorBoundary'

type PartialState = { hasError: boolean; error: Error | null }

const sampleError = new Error('boom')

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    ;(localStorage.getItem as ReturnType<typeof vi.fn>).mockClear()
    ;(localStorage.setItem as ReturnType<typeof vi.fn>).mockClear()
    ;(localStorage.removeItem as ReturnType<typeof vi.fn>).mockClear()
  })

  it('defaults to no error state', () => {
    const boundary = new ErrorBoundary({ children: null }, {})
    expect(boundary.state).toEqual<PartialState>({ hasError: false, error: null })
  })

  it('getDerivedStateFromError marks error state', () => {
    const next = ErrorBoundary.getDerivedStateFromError(sampleError)
    expect(next).toEqual<PartialState>({ hasError: true, error: sampleError })
  })

  it('logs caught errors to console and local log store', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const setItemSpy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {})
    vi.spyOn(localStorage, 'getItem').mockReturnValue(null)

    const boundary = new ErrorBoundary({ children: null }, {})
    boundary.componentDidCatch(sampleError)

    expect(consoleSpy).toHaveBeenCalledWith('[lingoforge]', expect.objectContaining({ message: 'boom' }))
    expect(setItemSpy).toHaveBeenCalledOnce()

    const call = setItemSpy.mock.calls[0] as [string, string]
    expect(call[0]).toBe('__lingoforge_error_log')
    expect(JSON.parse(call[1])).toEqual([
      expect.objectContaining({ message: 'boom', timestamp: expect.any(String) }),
    ])
  })

  it('uses the injected context for local logs when provided', () => {
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {})
    vi.spyOn(localStorage, 'getItem').mockReturnValue(null)
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const boundary = new ErrorBoundary({ children: null, context: 'profile-sync' }, {})
    boundary.componentDidCatch(sampleError)

    expect(consoleSpy).toHaveBeenCalledWith('[profile-sync]', expect.any(Object))
  })

  it('resets to the happy state via resetError', () => {
    const boundary = new ErrorBoundary({ children: null }, {})
    boundary.setState = vi.fn()
    boundary.resetError()

    expect(boundary.setState).toHaveBeenCalledWith<PartialState>({ hasError: false, error: null })
  })

  it('renders custom fallback when provided', () => {
    const fallback = ({ error }: ErrorBoundaryFallbackProps) => <div data-custom>{error.message}</div>
    const boundary = new ErrorBoundary({ children: null, fallback }, {})
    boundary.state = { hasError: true, error: sampleError }
    const rendered = boundary.render() as ReactElement<{ children: string }>
    expect(rendered.props.children).toBe('boom')
  })
})
