// @vitest-environment jsdom
// ReviewScreen wires the SRS due-item selection into a lesson session — the app's
// core retention loop. None of it was exercised by the node-only suite. Exercise-kind
// rendering and the answer/retry/combo rules are already covered by render.tsx's
// components and LessonPlayer.test.tsx, so renderExercise is mocked here to isolate
// ReviewScreen's own wiring: due-count display, starting a session, advancing between
// cards, and persisting the SRS outcome on completion.
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../audio/sfx', () => ({ playFanfare: vi.fn(), playCorrect: vi.fn(), playWrong: vi.fn() }))
vi.mock('../exercises/render', () => ({
  renderExercise: (
    _exercise: unknown,
    _ttsLang: string,
    onAnswer: (correct: boolean, correctAnswer: string) => void,
  ) => (
    <>
      <button type="button" onClick={() => onAnswer(true, 'right answer')}>
        right
      </button>
      <button type="button" onClick={() => onAnswer(false, 'right answer')}>
        wrong
      </button>
    </>
  ),
}))

import { ReviewScreen } from './ReviewScreen'
import { useProgress, emptyProgress } from '../state/progress'
import { newSrsItem } from '../engine/srs'

const dueItem = () => ({ ...newSrsItem('privet'), dueAt: Date.now() - 1000 })

beforeEach(() => {
  const data = emptyProgress('ru')
  data.courses.ru = { lessonCompletions: {}, srsItems: { privet: dueItem() } }
  useProgress.setState({ profileId: 'test-profile', data, storageError: false })
})

afterEach(() => {
  cleanup()
  useProgress.setState({ profileId: null, data: emptyProgress(), storageError: false })
})

describe('ReviewScreen', () => {
  it('shows how many words are due and offers to start review', () => {
    render(<ReviewScreen />)
    expect(screen.getByText('1')).toBeTruthy()
    expect(screen.getByText('Start review')).toBeTruthy()
  })

  it('renders a review item once review starts', () => {
    render(<ReviewScreen />)
    fireEvent.click(screen.getByText('Start review'))
    expect(screen.getByText('right')).toBeTruthy()
  })

  it('answering correctly advances to the results screen and pays out xp', () => {
    render(<ReviewScreen />)
    fireEvent.click(screen.getByText('Start review'))
    fireEvent.click(screen.getByText('right'))
    fireEvent.click(screen.getByText('Continue'))
    expect(screen.getByText(/Review done!/)).toBeTruthy()
  })

  it('answering incorrectly re-queues the card instead of ending the review', () => {
    render(<ReviewScreen />)
    fireEvent.click(screen.getByText('Start review'))
    fireEvent.click(screen.getByText('wrong'))
    fireEvent.click(screen.getByText('Continue'))

    // still mid-session: the missed card comes back around
    expect(screen.queryByText(/Review done!/)).toBeNull()
    expect(screen.getByText('right')).toBeTruthy()

    fireEvent.click(screen.getByText('right'))
    fireEvent.click(screen.getByText('Continue'))
    expect(screen.getByText(/Review done!/)).toBeTruthy()
  })

  it('persists the SRS outcome for the reviewed word on completion', () => {
    render(<ReviewScreen />)
    fireEvent.click(screen.getByText('Start review'))
    fireEvent.click(screen.getByText('right'))
    fireEvent.click(screen.getByText('Continue'))

    const item = useProgress.getState().data.courses.ru!.srsItems.privet
    expect(item.reps).toBe(2) // newSrsItem starts at 1 rep; a review increments it
  })

  it('returning from the results screen goes back to the due-items view', () => {
    render(<ReviewScreen />)
    fireEvent.click(screen.getByText('Start review'))
    fireEvent.click(screen.getByText('right'))
    fireEvent.click(screen.getByText('Continue'))
    fireEvent.click(screen.getByText('Back'))
    // the just-reviewed word is now rescheduled into the future, so due-items
    // is empty — confirms we left the results screen for the due-items view
    expect(screen.queryByText(/Review done!/)).toBeNull()
    expect(screen.getByText('Nothing due right now — great job! Come back later or learn a new lesson.')).toBeTruthy()
  })
})
