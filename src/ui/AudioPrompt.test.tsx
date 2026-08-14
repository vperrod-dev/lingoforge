// @vitest-environment jsdom
// A phone with no Russian voice used to leave listening exercises silent and
// unanswerable, with nothing on screen to say so.
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'

import { AudioPrompt } from './AudioPrompt'

const speak = vi.hoisted(() => vi.fn())
vi.mock('../audio/tts', () => ({ speak }))

afterEach(() => { cleanup(); speak.mockReset() })

test('shows the text when a tap on the speaker produces no sound', async () => {
  speak.mockResolvedValue(false)
  render(<AudioPrompt text="Где метро" lang="ru-RU" />)
  fireEvent.click(screen.getByLabelText('Replay audio'))
  await waitFor(() => expect(screen.getByText('Где метро')).toBeTruthy())
})

test('stays audio-only while the device is speaking', async () => {
  speak.mockResolvedValue(true)
  render(<AudioPrompt text="Где метро" lang="ru-RU" />)
  fireEvent.click(screen.getByLabelText('Replay audio'))
  await waitFor(() => expect(speak).toHaveBeenCalledTimes(2))
  expect(screen.queryByText('Где метро')).toBeNull()
})
