// @vitest-environment jsdom
// PointLearnScreen drives a 6-state phase machine (camera/scanning/results/offline/
// error/no-camera) around getUserMedia and a local Ollama vision call. None of it was
// exercised by the node-only suite.
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../services/ollama', () => ({ isOllamaOnline: vi.fn() }))
vi.mock('../services/vision', () => ({ identifyObjects: vi.fn(), captureFrame: vi.fn() }))

import { isOllamaOnline } from '../services/ollama'
import { identifyObjects, captureFrame } from '../services/vision'
import { PointLearnScreen } from './PointLearnScreen'
import { useSettings } from '../state/settings'

const mockIsOllamaOnline = vi.mocked(isOllamaOnline)
const mockIdentifyObjects = vi.mocked(identifyObjects)
const mockCaptureFrame = vi.mocked(captureFrame)

const fakeStream = { getTracks: () => [] } as unknown as MediaStream
const mockGetUserMedia = vi.fn()

const detectedObject = {
  nameEn: 'cup',
  nameTarget: 'taza',
  pronunciation: 'TAH-sah',
  example: 'La taza es azul.',
  exampleTranslation: 'The cup is blue.',
  bbox: [10, 20, 30, 40] as [number, number, number, number],
}

beforeEach(() => {
  useSettings.setState({ aiEnabled: true })
  mockGetUserMedia.mockReset().mockResolvedValue(fakeStream)
  Object.defineProperty(navigator, 'mediaDevices', {
    value: { getUserMedia: mockGetUserMedia },
    configurable: true,
  })
  mockIsOllamaOnline.mockReset().mockResolvedValue(true)
  mockIdentifyObjects.mockReset().mockResolvedValue([detectedObject])
  mockCaptureFrame.mockReset().mockReturnValue('base64frame')
})

afterEach(() => {
  cleanup()
  useSettings.setState({ aiEnabled: false })
})

const snap = () => fireEvent.click(screen.getByLabelText('Take photo'))

describe('PointLearnScreen phase machine', () => {
  it('starts the camera and shows the capture button when getUserMedia succeeds', async () => {
    render(<PointLearnScreen />)
    expect(await screen.findByLabelText('Take photo')).toBeTruthy()
    expect(mockGetUserMedia).toHaveBeenCalledOnce()
  })

  it('moves to no-camera when getUserMedia is denied', async () => {
    mockGetUserMedia.mockRejectedValue(new Error('NotAllowedError'))
    render(<PointLearnScreen />)
    expect(await screen.findByText('Camera access denied')).toBeTruthy()
  })

  it('moves to offline when Ollama is unreachable on capture', async () => {
    mockIsOllamaOnline.mockResolvedValue(false)
    render(<PointLearnScreen />)
    await screen.findByLabelText('Take photo')
    snap()
    expect(await screen.findByText('Ollama is not running')).toBeTruthy()
    expect(mockIdentifyObjects).not.toHaveBeenCalled()
  })

  it('passes through scanning before landing on results when detection succeeds', async () => {
    let resolveDetection!: (objs: (typeof detectedObject)[]) => void
    mockIdentifyObjects.mockReturnValue(
      new Promise((resolve) => {
        resolveDetection = resolve
      }),
    )
    render(<PointLearnScreen />)
    await screen.findByLabelText('Take photo')
    snap()

    expect(await screen.findByText('Identifying objects...')).toBeTruthy()

    resolveDetection([detectedObject])
    expect(await screen.findByText('1 object found')).toBeTruthy()
  })

  it('moves to error when detection throws', async () => {
    mockIdentifyObjects.mockRejectedValue(new Error('model unavailable'))
    render(<PointLearnScreen />)
    await screen.findByLabelText('Take photo')
    snap()
    expect(await screen.findByText('model unavailable')).toBeTruthy()
  })

  it('moves to error when detection returns no objects', async () => {
    mockIdentifyObjects.mockResolvedValue([])
    render(<PointLearnScreen />)
    await screen.findByLabelText('Take photo')
    snap()
    expect(await screen.findByText('No objects detected — try a different angle')).toBeTruthy()
  })

  it('aborts the in-flight detection when unmounted mid-scan', async () => {
    let resolveDetection!: (objs: (typeof detectedObject)[]) => void
    mockIdentifyObjects.mockReturnValue(
      new Promise((resolve) => {
        resolveDetection = resolve
      }),
    )
    const { unmount } = render(<PointLearnScreen />)
    await screen.findByLabelText('Take photo')
    snap()
    await screen.findByText('Identifying objects...')

    unmount()
    resolveDetection([detectedObject])

    const signal = mockIdentifyObjects.mock.calls[0][2]
    expect(signal?.aborted).toBe(true)
  })

  it('retrying from offline restarts the camera', async () => {
    mockIsOllamaOnline.mockResolvedValue(false)
    render(<PointLearnScreen />)
    await screen.findByLabelText('Take photo')
    snap()
    await screen.findByText('Ollama is not running')

    mockGetUserMedia.mockClear()
    fireEvent.click(screen.getByText('Try again'))

    await waitFor(() => expect(mockGetUserMedia).toHaveBeenCalledOnce())
    expect(await screen.findByLabelText('Take photo')).toBeTruthy()
  })
})
