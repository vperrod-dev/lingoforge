// @vitest-environment jsdom
// Without this keypad a phone learner cannot type a single Russian answer.
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'

import { ScriptKeypad } from './ScriptKeypad'

afterEach(cleanup)

test('tapping a Cyrillic key inserts that letter', () => {
  const onInsert = vi.fn()
  render(<ScriptKeypad lang="ru-RU" onInsert={onInsert} onBackspace={vi.fn()} />)
  fireEvent.click(screen.getByText('п'))
  expect(onInsert).toHaveBeenCalledWith('п')
})

test('Spanish gets the accented letters it needs', () => {
  const onInsert = vi.fn()
  render(<ScriptKeypad lang="es-ES" onInsert={onInsert} onBackspace={vi.fn()} />)
  fireEvent.click(screen.getByText('ñ'))
  expect(onInsert).toHaveBeenCalledWith('ñ')
})

test('backspace deletes', () => {
  const onBackspace = vi.fn()
  render(<ScriptKeypad lang="ru-RU" onInsert={vi.fn()} onBackspace={onBackspace} />)
  fireEvent.click(screen.getByLabelText('Delete last letter'))
  expect(onBackspace).toHaveBeenCalled()
})

test('a language typed on any keyboard gets no keypad', () => {
  const { container } = render(
    <ScriptKeypad lang="en-US" onInsert={vi.fn()} onBackspace={vi.fn()} />,
  )
  expect(container.innerHTML).toBe('')
})

test('the keypad can be hidden by learners who have the real keyboard', () => {
  render(<ScriptKeypad lang="ru-RU" onInsert={vi.fn()} onBackspace={vi.fn()} />)
  fireEvent.click(screen.getByText('Hide keyboard'))
  expect(screen.queryByText('п')).toBeNull()
})
