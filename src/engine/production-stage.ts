import type { Course } from '../content/types'
import { ruAlphabet } from '../content'

/**
 * How much a learner is asked to produce, by learner stage — never by how many
 * times one lesson was replayed:
 *
 * - `letters`: alphabet not yet learned. Production = pick, chips, and filling
 *   one or two missing letters of a word that is shown. Never a whole word.
 * - `tiles`: alphabet done. Whole words from letter tiles, sentences from chips.
 * - `typing`: alphabet done and the beginner units (1–2) completed. Free text.
 */
export type Stage = 'letters' | 'tiles' | 'typing'

const ORDER: Stage[] = ['letters', 'tiles', 'typing']

/** Path Unit 0 for Russian: one drill per alphabet group, then the confusable pairs. */
export const ALPHABET_DRILL_IDS = [...ruAlphabet.groups.map((g) => `alpha-${g.id}`), 'alpha-confusables']

/** Units a learner must finish (every lesson once) before typing unlocks. */
const BEGINNER_UNITS = 2

type Completions = Record<string, number>

export function alphabetDrillDone(id: string, completions: Completions): boolean {
  // Older profiles completed per-level drills (`alpha-<group>-L1..3`); any of them counts.
  return Boolean(completions[id] || completions[`${id}-L1`] || completions[`${id}-L2`] || completions[`${id}-L3`])
}

export function alphabetDone(courseId: string, completions: Completions): boolean {
  if (courseId !== 'ru') return true
  return ALPHABET_DRILL_IDS.every((id) => alphabetDrillDone(id, completions))
}

export function courseStage(course: Course, completions: Completions): Stage {
  if (!alphabetDone(course.id, completions)) return 'letters'
  const beginnerLessons = course.units.slice(0, BEGINNER_UNITS).flatMap((u) => u.skills.flatMap((s) => s.lessons))
  return beginnerLessons.every((l) => (completions[l.id] ?? 0) > 0) ? 'typing' : 'tiles'
}

/** Stage for one lesson play: the course stage, and typing only from the third pass. */
export function lessonStage(course: Course, completions: Completions, crownLevel: number): Stage {
  const byCourse = courseStage(course, completions)
  const byCrown: Stage = crownLevel >= 2 ? 'typing' : 'tiles'
  return ORDER[Math.min(ORDER.indexOf(byCourse), ORDER.indexOf(byCrown))]
}
