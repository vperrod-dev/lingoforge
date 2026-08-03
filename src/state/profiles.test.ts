import { describe, it, expect, beforeEach, vi } from 'vitest'

// node test env has no localStorage; stub before profiles.ts (zustand persist) loads
vi.hoisted(() => {
  const store = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  })
})

import { useProfiles, progressStorageKey } from './profiles'

const create = (name = 'Anna') => useProfiles.getState().createProfile(name, '🦊', ['ru'])

describe('progressStorageKey', () => {
  it('namespaces the key by profile id', () => {
    expect(progressStorageKey('p1')).toBe('lingoforge:p1:progress')
  })
})

describe('useProfiles store', () => {
  beforeEach(() => {
    localStorage.clear()
    useProfiles.setState({ profiles: [], activeProfileId: null })
  })

  describe('createProfile', () => {
    it('adds the profile to the list', () => {
      const p = create()
      expect(useProfiles.getState().profiles).toEqual([p])
    })

    it('activates the new profile', () => {
      const p = create()
      expect(useProfiles.getState().activeProfileId).toBe(p.id)
    })

    it('returns the requested name and courses', () => {
      expect(create('Boris')).toMatchObject({ name: 'Boris', avatar: '🦊', courses: ['ru'] })
    })

    it('gives each profile a unique id', () => {
      expect(create('A').id).not.toBe(create('B').id)
    })
  })

  describe('switchProfile', () => {
    it('changes the active profile', () => {
      const first = create('A')
      create('B')
      useProfiles.getState().switchProfile(first.id)
      expect(useProfiles.getState().activeProfileId).toBe(first.id)
    })

    it('accepts null to deselect', () => {
      create()
      useProfiles.getState().switchProfile(null)
      expect(useProfiles.getState().activeProfileId).toBeNull()
    })
  })

  describe('deleteProfile', () => {
    it('removes the profile from the list', () => {
      const p = create()
      useProfiles.getState().deleteProfile(p.id)
      expect(useProfiles.getState().profiles).toEqual([])
    })

    it('clears the active profile when it was the one deleted', () => {
      const p = create()
      useProfiles.getState().deleteProfile(p.id)
      expect(useProfiles.getState().activeProfileId).toBeNull()
    })

    it('keeps the active profile when a different one is deleted', () => {
      const a = create('A')
      const b = create('B')
      useProfiles.getState().deleteProfile(a.id)
      expect(useProfiles.getState().activeProfileId).toBe(b.id)
    })

    it('removes the profile progress from localStorage', () => {
      const p = create()
      localStorage.setItem(progressStorageKey(p.id), '{"xp":1}')
      useProfiles.getState().deleteProfile(p.id)
      expect(localStorage.getItem(progressStorageKey(p.id))).toBeNull()
    })
  })

  describe('storage failure', () => {
    it('does not throw when localStorage.setItem fails (quota / private mode)', () => {
      vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
        throw new DOMException('QuotaExceededError')
      })
      expect(() => create()).not.toThrow()
      vi.restoreAllMocks()
    })

    it('does not throw when localStorage.removeItem fails during deleteProfile', () => {
      const p = create()
      vi.spyOn(localStorage, 'removeItem').mockImplementation(() => {
        throw new DOMException('SecurityError')
      })
      expect(() => useProfiles.getState().deleteProfile(p.id)).not.toThrow()
      vi.restoreAllMocks()
    })

    it('still removes the profile from state when localStorage.removeItem fails', () => {
      const p = create()
      vi.spyOn(localStorage, 'removeItem').mockImplementation(() => {
        throw new DOMException('SecurityError')
      })
      useProfiles.getState().deleteProfile(p.id)
      vi.restoreAllMocks()
      expect(useProfiles.getState().profiles).toEqual([])
    })
  })

  describe('addCourse', () => {
    it('appends a new course to the profile', () => {
      const p = create()
      useProfiles.getState().addCourse(p.id, 'es')
      expect(useProfiles.getState().profiles[0].courses).toEqual(['ru', 'es'])
    })

    it('does not duplicate an existing course', () => {
      const p = create()
      useProfiles.getState().addCourse(p.id, 'ru')
      expect(useProfiles.getState().profiles[0].courses).toEqual(['ru'])
    })

    it('leaves other profiles untouched', () => {
      const a = create('A')
      create('B')
      useProfiles.getState().addCourse(a.id, 'es')
      expect(useProfiles.getState().profiles[1].courses).toEqual(['ru'])
    })
  })
})
