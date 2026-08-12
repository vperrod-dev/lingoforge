// @vitest-environment jsdom
// A phone is where speaking breaks: the mic can be blocked, missing, or the
// browser may have no recognizer at all. None of that may strand the learner in
// a lesson, and the phrase must be readable even when audio never plays.
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'

vi.mock('../audio/tts', () => ({ speak: vi.fn(), stopSpeaking: vi.fn() }))

import { SpeakExercise } from './SpeakExercise'

afterEach(() => {
  cleanup()
  delete (window as unknown as Record<string, unknown>).SpeechRecognition
})

interface FakeRecognition {
  onerror: ((e: { error: string }) => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

/** Installs a recognizer whose start() immediately reports `errorCode`. */
function stubFailingRecognizer(errorCode: string) {
  const w = window as unknown as Record<string, unknown>
  w.SpeechRecognition = function (this: FakeRecognition) {
    this.onerror = null
    this.start = () => this.onerror?.({ error: errorCode })
    this.stop = () => {}
    this.abort = () => {}
  } as unknown as new () => unknown
}

const renderExercise = (onAnswer = vi.fn()) => {
  render(
    <SpeakExercise
      ttsText="привет"
      ttsLang="ru-RU"
      hint="pree-VYET"
      accept={['привет']}
      answer="привет"
      onAnswer={onAnswer}
    />,
  )
  return onAnswer
}

test('the phrase to say is on screen, not only spoken', () => {
  renderExercise()
  expect(screen.getByText('привет')).toBeTruthy()
})

test('a browser without speech recognition says so instead of showing a dead mic', () => {
  renderExercise()
  expect(screen.queryByLabelText('Record your voice')).toBeNull()
  expect(screen.getByRole('status').textContent).toContain("can't listen to you")
})

test('a blocked microphone explains itself', () => {
  stubFailingRecognizer('not-allowed')
  renderExercise()
  fireEvent.click(screen.getByLabelText('Record your voice'))
  expect(screen.getByRole('status').textContent).toContain('Microphone blocked')
})

test('skipping moves on without scoring the word wrong', () => {
  const onAnswer = renderExercise()
  fireEvent.click(screen.getByText("Can't speak now — skip"))
  expect(onAnswer).toHaveBeenCalledWith(false, 'привет', { skipped: true })
})

test('the transliteration tells a learner who cannot read Cyrillic how to say it', () => {
  renderExercise()
  expect(screen.getByText('say it like: pree-VYET')).toBeTruthy()
})
