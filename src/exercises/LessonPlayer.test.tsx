// @vitest-environment jsdom
// LessonPlayer owns the rules a learner actually feels — wrong answers coming
// back around, the combo multiplier, and what the lesson reports when it ends.
// None of it was exercised by the node-only suite.
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'

vi.mock('../audio/sfx', () => ({ playCorrect: vi.fn(), playWrong: vi.fn() }))

import { LessonPlayer, type LessonResult } from './LessonPlayer'
import type { ExerciseInstance } from '../engine/exercise-gen'

afterEach(cleanup)

const exercises = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    kind: 'translate',
    vocabIds: [`v${i}`],
    prompt: `q${i}`,
  })) as unknown as ExerciseInstance[]

function play(count: number) {
  const onComplete = vi.fn<(r: LessonResult) => void>()
  render(
    <LessonPlayer
      exercises={exercises(count)}
      ttsLang="es-ES"
      renderExercise={(_exercise, onAnswer) => (
        <>
          <button type="button" onClick={() => onAnswer(true, 'sí')}>
            right
          </button>
          <button type="button" onClick={() => onAnswer(false, 'sí')}>
            wrong
          </button>
          <button type="button" onClick={() => onAnswer(false, 'sí', { skipped: true })}>
            skip
          </button>
        </>
      )}
      onComplete={onComplete}
      onExit={vi.fn()}
    />,
  )
  const answer = (correct: boolean) => {
    fireEvent.click(screen.getByText(correct ? 'right' : 'wrong'))
    fireEvent.click(screen.getByText('Continue'))
  }
  // A skip advances on its own — no feedback footer to dismiss.
  const skip = () => fireEvent.click(screen.getByText('skip'))
  return { onComplete, answer, skip }
}

test('a lesson answered correctly reports every answer as first-try correct', () => {
  const { onComplete, answer } = play(2)
  answer(true)
  answer(true)
  expect(onComplete.mock.calls[0][0].correct).toBe(2)
})

test('a wrong answer sends the exercise back around instead of ending the lesson', () => {
  const { onComplete, answer } = play(2)
  answer(false)
  answer(true)
  expect(onComplete).not.toHaveBeenCalled()
})

test('an exercise answered right only on the retry does not count as first-try correct', () => {
  const { onComplete, answer } = play(2)
  answer(false)
  answer(true)
  answer(true) // the re-queued first exercise
  expect(onComplete.mock.calls[0][0].correct).toBe(1)
})

test('a completed lesson still reports the original exercise count, not the retries', () => {
  const { onComplete, answer } = play(2)
  answer(false)
  answer(true)
  answer(true)
  expect(onComplete.mock.calls[0][0].total).toBe(2)
})

test('finishing a lesson adds the completion bonus to the earned XP', () => {
  const { onComplete, answer } = play(2)
  answer(true)
  answer(true)
  expect(onComplete.mock.calls[0][0].xp).toBe(40) // 10 + 10 + 20 bonus
})

test('a five-answer streak pays the combo multipliers', () => {
  const { onComplete, answer } = play(5)
  for (let i = 0; i < 5; i++) answer(true)
  expect(onComplete.mock.calls[0][0].xp).toBe(90) // 10+10+15+15+20, +20 bonus
})

test('a wrong answer breaks the combo back to the base rate', () => {
  const { onComplete, answer } = play(4)
  answer(true) // combo 1 → 10
  answer(true) // combo 2 → 10
  answer(false) // combo reset, exercise re-queued
  answer(true) // combo 1 again → 10, not the 15 a combo 3 would pay
  answer(true) // the retry, which earns nothing
  expect(onComplete.mock.calls[0][0].xp).toBe(50) // 30 + 20 bonus
})

test('each exercise reports the outcome of its own vocabulary', () => {
  const { onComplete, answer } = play(2)
  answer(false)
  answer(true)
  answer(true)
  expect(onComplete.mock.calls[0][0].vocabOutcomes).toEqual({ v0: false, v1: true })
})

test('the exit button leaves the lesson', () => {
  const onExit = vi.fn()
  render(
    <LessonPlayer
      exercises={exercises(1)}
      ttsLang="es-ES"
      renderExercise={() => null}
      onComplete={vi.fn()}
      onExit={onExit}
    />,
  )
  fireEvent.click(screen.getByLabelText('Exit lesson'))
  expect(onExit).toHaveBeenCalled()
})

test('a skipped exercise moves on without being marked wrong', () => {
  const { onComplete, answer, skip } = play(2)
  skip()
  answer(true)
  expect(onComplete.mock.calls[0][0].vocabOutcomes).toEqual({ v1: true })
})

test('a skipped exercise does not come back around', () => {
  const { onComplete, answer, skip } = play(2)
  skip()
  answer(true)
  expect(onComplete).toHaveBeenCalledTimes(1)
})
