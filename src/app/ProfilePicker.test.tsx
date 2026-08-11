// @vitest-environment jsdom
// ProfilePicker's delete flow is the app's only irreversible action (profile +
// progress gone), gated by a window.confirm. The state-layer deleteProfile logic
// is covered in profiles.test.ts, so this isolates the component wiring: the
// confirm gate must actually block/allow the deletion. window.confirm is mocked
// at the boundary (jsdom has no real dialog).
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ProfilePicker } from './ProfilePicker'
import { useProfiles, type Profile } from '../state/profiles'

const anna: Profile = { id: 'p1', name: 'Anna', avatar: '🦊', courses: ['ru'], createdAt: 0 }

beforeEach(() => {
  useProfiles.setState({ profiles: [anna], activeProfileId: null })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  useProfiles.setState({ profiles: [], activeProfileId: null })
})

describe('ProfilePicker delete flow', () => {
  it('deletes the profile when the confirm dialog is accepted', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<ProfilePicker />)
    fireEvent.click(screen.getByRole('button', { name: 'Delete Anna' }))
    expect(useProfiles.getState().profiles).toEqual([])
  })

  it('keeps the profile when the confirm dialog is dismissed', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<ProfilePicker />)
    fireEvent.click(screen.getByRole('button', { name: 'Delete Anna' }))
    expect(useProfiles.getState().profiles).toEqual([anna])
  })

  it('warns with the profile name so the user knows whose progress is erased', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<ProfilePicker />)
    fireEvent.click(screen.getByRole('button', { name: 'Delete Anna' }))
    expect(confirm).toHaveBeenCalledWith('Delete Anna? All their progress will be erased.')
  })
})
