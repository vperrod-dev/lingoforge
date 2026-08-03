import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CourseId } from '../content/types'
import { safeJSONStorage } from './safe-storage'

/** crypto.randomUUID is missing on some older browsers / non-secure contexts */
function newProfileId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `p-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export interface Profile {
  id: string
  name: string
  /** Emoji avatar shown on profile cards (display only, not UI iconography) */
  avatar: string
  courses: CourseId[]
  createdAt: number
}

interface ProfilesState {
  profiles: Profile[]
  activeProfileId: string | null
  createProfile: (name: string, avatar: string, courses: CourseId[]) => Profile
  switchProfile: (id: string | null) => void
  deleteProfile: (id: string) => void
  addCourse: (profileId: string, course: CourseId) => void
}

export const useProfiles = create<ProfilesState>()(
  persist(
    (set) => ({
      profiles: [],
      activeProfileId: null,
      createProfile: (name, avatar, courses) => {
        const profile: Profile = {
          id: newProfileId(),
          name,
          avatar,
          courses,
          createdAt: Date.now(),
        }
        set((s) => ({ profiles: [...s.profiles, profile], activeProfileId: profile.id }))
        return profile
      },
      switchProfile: (id) => set({ activeProfileId: id }),
      deleteProfile: (id) =>
        set((s) => {
          try {
            localStorage.removeItem(progressStorageKey(id))
          } catch (e) {
            // QuotaExceededError/SecurityError (Safari private mode) — the profile
            // is still removed from state below; only the orphaned progress blob
            // is left behind in storage.
            console.warn('lingoforge: failed to remove progress from localStorage', e)
          }
          return {
            profiles: s.profiles.filter((p) => p.id !== id),
            activeProfileId: s.activeProfileId === id ? null : s.activeProfileId,
          }
        }),
      addCourse: (profileId, course) =>
        set((s) => ({
          profiles: s.profiles.map((p) =>
            p.id === profileId && !p.courses.includes(course)
              ? { ...p, courses: [...p.courses, course] }
              : p,
          ),
        })),
    }),
    { name: 'lingoforge:profiles', storage: safeJSONStorage },
  ),
)

export function progressStorageKey(profileId: string): string {
  return `lingoforge:${profileId}:progress`
}
