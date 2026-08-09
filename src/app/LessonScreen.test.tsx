// @vitest-environment jsdom
// LessonScreen's handleComplete is the core lesson-completion path: it records the
// crown, pays out XP, maps per-word outcomes into the SRS queue, and sweeps badges.
// Exercise-kind rendering is covered elsewhere (render.tsx components, LessonPlayer.test.tsx),
// so renderExercise is mocked here to drive the full exercise queue and isolate
// LessonScreen's own wiring.
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router'
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

import { LessonScreen } from './LessonScreen'
import { useProgress, emptyProgress } from '../state/progress'

// u1s1l2 ("Being polite") has no grammar note, so LessonScreen skips straight to the player.
const COURSE_ID = 'ru'
const LESSON_ID = 'u1s1l2'

function renderLesson() {
  render(
    <MemoryRouter initialEntries={[`/lesson/${COURSE_ID}/${LESSON_ID}`]}>
      <Routes>
        <Route path="/lesson/:courseId/:lessonId" element={<LessonScreen />} />
      </Routes>
    </MemoryRouter>,
  )
}

function finishLesson() {
  // drive the queue until the "Lesson complete!" screen shows
  while (screen.queryByText('Lesson complete!') === null) {
    fireEvent.click(screen.getByText('right'))
    fireEvent.click(screen.getByText('Continue'))
  }
}

beforeEach(() => {
  useProgress.setState({ profileId: 'test-profile', data: emptyProgress(COURSE_ID), storageError: false })
})

afterEach(() => {
  cleanup()
  useProgress.setState({ profileId: null, data: emptyProgress(), storageError: false })
})

describe('LessonScreen', () => {
  it('completing a lesson awards xp and shows the results screen', () => {
    renderLesson()
    finishLesson()
    expect(screen.getByText('Lesson complete!')).toBeTruthy()
    expect(useProgress.getState().data.xp).toBeGreaterThan(0)
  })

  it('bumps the crown level for the completed lesson', () => {
    renderLesson()
    finishLesson()
    expect(useProgress.getState().data.courses.ru?.lessonCompletions[LESSON_ID]).toBe(1)
  })

  it('records an SRS outcome for every word in the lesson', () => {
    renderLesson()
    finishLesson()
    const srsItems = useProgress.getState().data.courses.ru?.srsItems ?? {}
    for (const vocabId of ['zdravstvuyte', 'do-svidaniya', 'pozhaluysta', 'izvinite']) {
      expect(srsItems[vocabId]).toBeTruthy()
    }
  })

  it('awards the first-lesson badge on completion', () => {
    renderLesson()
    finishLesson()
    expect(useProgress.getState().data.badges['first-lesson']).toBeTruthy()
  })
})
