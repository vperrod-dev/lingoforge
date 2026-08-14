// @vitest-environment jsdom
// The complaint that started this: "I am just learning Russian, I cannot be
// putting full words in writing". Nothing a first-pass lesson renders may ask
// for typed input — checked on the real components, not just the generator.
import { render, cleanup } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'

import { courses } from '../content'
import { generateLessonExercises } from '../engine/exercise-gen'
import { renderExercise } from './render'

vi.mock('../audio/tts', () => ({ speak: vi.fn().mockResolvedValue(true), stopSpeaking: vi.fn() }))

afterEach(cleanup)

const ru = courses.ru
const lesson = ru.units[0].skills[0].lessons[0]

test('a first-pass lesson renders no text input at all', () => {
  for (let attempt = 0; attempt < 20; attempt++) {
    for (const exercise of generateLessonExercises(ru, lesson, 0)) {
      const { container, unmount } = render(<>{renderExercise(exercise, ru.ttsLang, vi.fn())}</>)
      const inputs = container.querySelectorAll('input, textarea, [contenteditable="true"]')
      expect({ kind: exercise.kind, inputs: inputs.length }).toEqual({ kind: exercise.kind, inputs: 0 })
      unmount()
    }
  }
})
