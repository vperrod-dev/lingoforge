// @vitest-environment jsdom
// Every 🔊 in the app: a tap that makes no sound must say so, not look broken.
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'

import { SpeakerButton } from './SpeakerButton'

const speak = vi.hoisted(() => vi.fn())
vi.mock('../audio/tts', () => ({ speak }))

afterEach(() => { cleanup(); speak.mockReset() })

test('says so when the device made no sound', async () => {
  speak.mockResolvedValue(false)
  render(<SpeakerButton text="привет" lang="ru-RU" />)
  fireEvent.click(screen.getByLabelText('Play audio'))
  await waitFor(() => expect(screen.getByText(/No audio here/)).toBeTruthy())
})

test('stays quiet about it when the audio played', async () => {
  speak.mockResolvedValue(true)
  render(<SpeakerButton text="привет" lang="ru-RU" />)
  fireEvent.click(screen.getByLabelText('Play audio'))
  await waitFor(() => expect(speak).toHaveBeenCalledWith('привет', 'ru-RU'))
  expect(screen.queryByText(/No audio here/)).toBeNull()
})
