// @vitest-environment jsdom
// The hint is the escape hatch for a beginner staring at a blank Cyrillic field.
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'

import { TypingExercise } from './TypingExercise'

afterEach(cleanup)

const field = () => screen.getByLabelText('Your translation') as HTMLInputElement

const renderExercise = () =>
  render(
    <TypingExercise
      prompt="hello"
      accept={['привет']}
      answer="привет"
      ttsLang="ru-RU"
      onAnswer={vi.fn()}
    />,
  )

test('a hint reveals the next letter of the answer', () => {
  renderExercise()
  fireEvent.click(screen.getByText('Hint'))
  fireEvent.click(screen.getByText('Hint'))
  expect(field().value).toBe('пр')
})

test('the on-screen keyboard types into the answer field', () => {
  renderExercise()
  fireEvent.click(screen.getByText('д'))
  expect(field().value).toBe('д')
})
