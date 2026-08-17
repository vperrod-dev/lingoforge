// @vitest-environment jsdom
// The complaint that started this: "I am just learning Russian, I cannot be
// putting full words in writing". Nothing a beginner sees may ask for typed
// input, or for a whole word from tiles — checked on the real components, on
// every beginner lesson, at every crown level, and in Practice.
import { render, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { courses } from '../content'
import type { ExerciseInstance } from '../engine/exercise-gen'
import { generateLessonExercises } from '../engine/exercise-gen'
import { reviewExercise } from '../engine/review-exercise'
import { renderExercise } from './render'

vi.mock('../audio/tts', () => ({ speak: vi.fn().mockResolvedValue(true), stopSpeaking: vi.fn() }))

afterEach(cleanup)

const ru = courses.ru
const beginnerLessons = ru.units.slice(0, 2).flatMap((u) => u.skills.flatMap((s) => s.lessons))

function inputCount(exercise: ExerciseInstance): number {
  const { container, unmount } = render(<>{renderExercise(exercise, ru.ttsLang, vi.fn())}</>)
  const n = container.querySelectorAll('input, textarea, [contenteditable="true"]').length
  unmount()
  return n
}

describe('letters stage (alphabet not finished)', () => {
  test('no beginner lesson renders a text input at any crown level', () => {
    for (const lesson of beginnerLessons) {
      for (const crown of [0, 1, 2, 3, 5]) {
        for (const exercise of generateLessonExercises(ru, lesson, crown, 'letters')) {
          expect({ lesson: lesson.id, crown, kind: exercise.kind, inputs: inputCount(exercise) }).toEqual({
            lesson: lesson.id,
            crown,
            kind: exercise.kind,
            inputs: 0,
          })
        }
      }
    }
  })

  test('every spell in a beginner lesson shows the word with at most two blanks', () => {
    for (const lesson of beginnerLessons) {
      for (const exercise of generateLessonExercises(ru, lesson, 0, 'letters')) {
        if (exercise.kind !== 'spell' || exercise.answer.length < 2) continue // one letter is one guess
        const blanks = exercise.shown?.filter((ch) => ch === null).length
        expect({ word: exercise.answer, blanks }).toEqual({ word: exercise.answer, blanks: Math.min(2, blanks ?? 0) })
        expect(exercise.shown?.some((ch) => ch !== null)).toBe(true)
      }
    }
  })

  test('Practice never types, and never asks for a whole word, even for known words', () => {
    for (const vocab of ru.vocab.slice(0, 60)) {
      for (let i = 0; i < 6; i++) {
        const exercise = reviewExercise(ru, vocab, 'letters', true)
        expect(exercise.kind).not.toBe('typing')
        if (exercise.kind === 'spell' && exercise.answer.length > 1) expect(exercise.shown?.some((ch) => ch !== null)).toBe(true)
        expect(inputCount(exercise)).toBe(0)
      }
    }
  })
})

describe('tiles stage (alphabet done, beginner units not)', () => {
  test('lessons and Practice still render no text input', () => {
    for (const lesson of beginnerLessons) {
      for (const exercise of generateLessonExercises(ru, lesson, 5, 'tiles')) {
        expect({ kind: exercise.kind, inputs: inputCount(exercise) }).toEqual({ kind: exercise.kind, inputs: 0 })
      }
    }
    for (const vocab of ru.vocab.slice(0, 40)) {
      expect(inputCount(reviewExercise(ru, vocab, 'tiles', true))).toBe(0)
    }
  })
})
