import { create } from 'zustand'
import { courses } from '../content'
import type { CourseId } from '../content/types'
import type { SrsItem } from '../engine/srs'
import { newSrsItem, review } from '../engine/srs'
import { progressStorageKey } from './profiles'
import { progressDataSchema } from './progress.schema'

export interface DayLog {
  minutes: number
  xp: number
  lessons: number
}

export interface CourseProgress {
  /** lessonId → times completed (crown level, 0-5) */
  lessonCompletions: Record<string, number>
  srsItems: Record<string, SrsItem>
}

export interface ProgressData {
  xp: number
  activeCourse: CourseId
  dailyGoalMinutes: number
  /** 'YYYY-MM-DD' → log */
  dailyLog: Record<string, DayLog>
  badges: Record<string, number> // badgeId → earnedAt epoch ms
  courses: Partial<Record<CourseId, CourseProgress>>
}

const emptyProgress = (course: CourseId = 'ru'): ProgressData => ({
  xp: 0,
  activeCourse: course,
  dailyGoalMinutes: 10,
  dailyLog: {},
  badges: {},
  courses: {},
})

const emptyCourseProgress = (): CourseProgress => ({
  lessonCompletions: {},
  srsItems: {},
})

/** Shape check for imported backups — untrusted input, reject anything malformed.
 *  Delegates to the zod schema so nested entries are field-checked too: a
 *  partially-corrupted dailyLog/badges entry or srsItem (missing stability/
 *  difficulty/dueAt/reps/lapses) would otherwise slip through and turn
 *  streak/XP stats or the SRS schedule into NaN. The schema types courseIds
 *  as plain strings, so activeCourse must additionally be a known course. */
export function isProgressData(v: unknown): v is ProgressData {
  return progressDataSchema.safeParse(v).success && (v as ProgressData).activeCourse in courses
}

export function todayKey(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Consecutive days (ending today or yesterday) where the daily goal was met. */
export function computeStreak(dailyLog: Record<string, DayLog>, goalMinutes: number, now: Date = new Date()): number {
  let streak = 0
  const cursor = new Date(now)
  const metGoal = (key: string) => (dailyLog[key]?.minutes ?? 0) >= goalMinutes || (dailyLog[key]?.lessons ?? 0) > 0
  // today may still be in progress — start from today if met, else from yesterday
  if (!metGoal(todayKey(cursor))) cursor.setDate(cursor.getDate() - 1)
  while (metGoal(todayKey(cursor))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

interface ProgressState {
  profileId: string | null
  data: ProgressData
  /** true when the last save failed (storage full / private mode) — progress is not being persisted */
  storageError: boolean
  loadForProfile: (profileId: string, defaultCourse: CourseId) => void
  setActiveCourse: (course: CourseId) => void
  setDailyGoal: (minutes: number) => void
  addXp: (amount: number) => void
  addStudyMinutes: (minutes: number) => void
  completeLesson: (course: CourseId, lessonId: string, newVocabIds: string[]) => void
  /** Marks every lesson in the unlocked units before `unitIndex` as completed (placement test skip-ahead) */
  skipToUnit: (course: CourseId, unitIndex: number) => void
  reviewVocab: (course: CourseId, vocabId: string, correct: boolean) => void
  earnBadge: (badgeId: string) => void
  exportData: () => string
  importData: (json: string) => boolean
}

function saveToStorage(profileId: string | null, data: ProgressData): boolean {
  if (!profileId) return true
  try {
    localStorage.setItem(progressStorageKey(profileId), JSON.stringify(data))
    return true
  } catch (e) {
    // QuotaExceededError (Safari private mode, full storage) — keep in-memory state usable
    console.warn('lingoforge: failed to save progress to localStorage', e)
    return false
  }
}

export const useProgress = create<ProgressState>()((set, get) => {
  const update = (fn: (d: ProgressData) => ProgressData) => {
    const { profileId, data } = get()
    const next = fn(data)
    const saved = saveToStorage(profileId, next)
    set({ data: next, storageError: !saved })
  }

  const bumpDay = (d: ProgressData, delta: Partial<DayLog>): ProgressData => {
    const key = todayKey()
    const cur = d.dailyLog[key] ?? { minutes: 0, xp: 0, lessons: 0 }
    return {
      ...d,
      dailyLog: {
        ...d.dailyLog,
        [key]: {
          minutes: cur.minutes + (delta.minutes ?? 0),
          xp: cur.xp + (delta.xp ?? 0),
          lessons: cur.lessons + (delta.lessons ?? 0),
        },
      },
    }
  }

  return {
    profileId: null,
    data: emptyProgress(),
    storageError: false,

    loadForProfile: (profileId, defaultCourse) => {
      const key = progressStorageKey(profileId)
      const raw = localStorage.getItem(key)
      let data = emptyProgress(defaultCourse)
      if (raw) {
        let parsed: unknown
        try {
          parsed = JSON.parse(raw)
        } catch {
          parsed = undefined
        }
        if (isProgressData(parsed)) {
          data = parsed
        } else {
          // corrupted blob: keep it under a backup key instead of bricking the app
          try {
            localStorage.setItem(`${key}:corrupt`, raw)
          } catch (e) {
            // QuotaExceededError (Safari private mode, full storage) — losing the backup beats crashing on load
            console.warn('lingoforge: failed to back up corrupt progress blob', e)
          }
          console.warn(`lingoforge: corrupt progress for profile ${profileId}, starting fresh (backup at ${key}:corrupt)`)
        }
      }
      set({ profileId, data, storageError: false })
    },

    setActiveCourse: (course) => update((d) => ({ ...d, activeCourse: course })),
    setDailyGoal: (minutes) => update((d) => ({ ...d, dailyGoalMinutes: minutes })),

    addXp: (amount) => update((d) => bumpDay({ ...d, xp: d.xp + amount }, { xp: amount })),

    addStudyMinutes: (minutes) => update((d) => bumpDay(d, { minutes })),

    completeLesson: (course, lessonId, newVocabIds) =>
      update((d) => {
        const cp = d.courses[course] ?? emptyCourseProgress()
        const srsItems = { ...cp.srsItems }
        for (const id of newVocabIds) {
          if (!srsItems[id]) srsItems[id] = newSrsItem(id)
        }
        const next: ProgressData = {
          ...d,
          courses: {
            ...d.courses,
            [course]: {
              ...cp,
              lessonCompletions: {
                ...cp.lessonCompletions,
                [lessonId]: Math.min(5, (cp.lessonCompletions[lessonId] ?? 0) + 1),
              },
              srsItems,
            },
          },
        }
        return bumpDay(next, { lessons: 1 })
      }),

    skipToUnit: (course, unitIndex) =>
      update((d) => {
        const cp = d.courses[course] ?? emptyCourseProgress()
        const unlockedUnits = courses[course].units.filter((u) => !u.locked)
        const lessonIds = unlockedUnits
          .slice(0, unitIndex)
          .flatMap((u) => u.skills.flatMap((s) => s.lessons.map((l) => l.id)))
        const lessonCompletions = { ...cp.lessonCompletions }
        for (const id of lessonIds) {
          lessonCompletions[id] = Math.max(1, lessonCompletions[id] ?? 0)
        }
        return {
          ...d,
          courses: { ...d.courses, [course]: { ...cp, lessonCompletions } },
        }
      }),

    reviewVocab: (course, vocabId, correct) =>
      update((d) => {
        const cp = d.courses[course] ?? emptyCourseProgress()
        const item = cp.srsItems[vocabId] ?? newSrsItem(vocabId)
        return {
          ...d,
          courses: {
            ...d.courses,
            [course]: { ...cp, srsItems: { ...cp.srsItems, [vocabId]: review(item, correct) } },
          },
        }
      }),

    earnBadge: (badgeId) =>
      update((d) => (d.badges[badgeId] ? d : { ...d, badges: { ...d.badges, [badgeId]: Date.now() } })),

    exportData: () => JSON.stringify(get().data, null, 2),

    importData: (json) => {
      try {
        const parsed: unknown = JSON.parse(json)
        if (!isProgressData(parsed)) return false
        update(() => parsed)
        return true
      } catch {
        return false
      }
    },
  }
})
