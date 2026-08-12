// @vitest-environment jsdom
// TopicLessonScreen's handleComplete is the AI-topic lesson-completion path: it pays out
// XP/study-minutes and maps per-word outcomes into the SRS queue, same as LessonScreen's
// (see LessonScreen.test.tsx). Exercise-kind rendering is covered elsewhere, so
// renderExercise is mocked here to drive the full exercise queue and isolate wiring.
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../audio/sfx', () => ({ playFanfare: vi.fn(), playCorrect: vi.fn(), playWrong: vi.fn() }))
vi.mock('../exercises/render', () => ({
  renderExercise: (
    _exercise: unknown,
    _ttsLang: string,
    onAnswer: (correct: boolean, correctAnswer: string) => void,
  ) => (
    <button type="button" onClick={() => onAnswer(true, 'right answer')}>
      right
    </button>
  ),
}))

import { TopicLessonScreen } from './TopicLessonScreen'
import { useProgress, emptyProgress, todayKey } from '../state/progress'

const COURSE_ID = 'es'

const topicLesson = {
  topic: 'Food',
  vocab: [
    { word: 'manzana', translation: 'apple', pronunciation: 'man-SAH-nah', example: 'La manzana es roja.', exampleTranslation: 'The apple is red.' },
    { word: 'pan', translation: 'bread', pronunciation: 'PAHN', example: 'Como pan.', exampleTranslation: 'I eat bread.' },
  ],
  ttsLang: 'es-ES',
}

function renderScreen() {
  render(
    <MemoryRouter>
      <TopicLessonScreen />
    </MemoryRouter>,
  )
}

function finishLesson() {
  while (screen.queryByText('Topic complete!') === null) {
    vi.advanceTimersByTime(2000)
    fireEvent.click(screen.getByText('right'))
    fireEvent.click(screen.getByText('Continue'))
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  sessionStorage.setItem('topicLesson', JSON.stringify(topicLesson))
  useProgress.setState({ profileId: 'test-profile', data: emptyProgress(COURSE_ID), storageError: false })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  sessionStorage.removeItem('topicLesson')
  useProgress.setState({ profileId: null, data: emptyProgress(), storageError: false })
})

describe('TopicLessonScreen', () => {
  it('completing a topic lesson awards xp and shows the results screen', () => {
    renderScreen()
    finishLesson()
    expect(screen.getByText('Topic complete!')).toBeTruthy()
    expect(useProgress.getState().data.xp).toBeGreaterThan(0)
  })

  it('credits study minutes to the daily log on completion', () => {
    renderScreen()
    finishLesson()
    expect(useProgress.getState().data.dailyLog[todayKey()]?.minutes).toBeGreaterThan(0)
  })

  it('records an SRS outcome for every topic word', () => {
    renderScreen()
    finishLesson()
    const srsItems = useProgress.getState().data.courses[COURSE_ID]?.srsItems ?? {}
    for (const v of topicLesson.vocab) {
      expect(srsItems[`topic:${v.word}`]).toBeTruthy()
    }
  })

  it('shows the no-data fallback instead of crashing on a malformed payload', () => {
    sessionStorage.setItem('topicLesson', JSON.stringify({ topic: 'Food' }))
    renderScreen()
    expect(screen.getByText('No topic lesson data found.')).toBeTruthy()
  })
})
