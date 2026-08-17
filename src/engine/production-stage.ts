import type { Course, Lesson } from '../content/types'
import { ruAlphabet } from '../content'
import type { AlphabetLetter } from '../content/types'

/**
 * How much a learner is asked to produce, by learner stage — never by how many
 * times one lesson was replayed:
 *
 * - `letters`: still meeting the alphabet. Each lesson introduces a few new letters
 *   (see `letterSchedule`) and production = pick, chips, and filling one or two
 *   missing letters of a word that is shown. Never a whole word.
 * - `tiles`: every letter has been introduced. Whole words from letter tiles.
 * - `typing`: letters done and the beginner units (1–2) completed. Free text.
 */
export type Stage = 'letters' | 'tiles' | 'typing'

const ORDER: Stage[] = ['letters', 'tiles', 'typing']

/** Units a learner must finish (every lesson once) before typing unlocks. */
const BEGINNER_UNITS = 2

/** At most this many new letters per lesson; the rest spill into the next lesson. */
const LETTERS_PER_LESSON = 6

/** Alphabet-tab drills (optional extra practice); any one of them done also counts a group. */
export const ALPHABET_DRILL_IDS = [...ruAlphabet.groups.map((g) => `alpha-${g.id}`), 'alpha-confusables']

type Completions = Record<string, number>

export function alphabetDrillDone(id: string, completions: Completions): boolean {
  // Older profiles completed per-level drills (`alpha-<group>-L1..3`); any of them counts.
  return Boolean(completions[id] || completions[`${id}-L1`] || completions[`${id}-L2`] || completions[`${id}-L3`])
}

const letterInfoByChar = new Map<string, AlphabetLetter>(
  ruAlphabet.groups.flatMap((g) => g.letters).map((l) => [l.lower, l]),
)

/** Sound / example for a Cyrillic letter (undefined for other scripts). */
export function letterInfo(ch: string): AlphabetLetter | undefined {
  return letterInfoByChar.get(ch.toLowerCase())
}

function lettersOf(text: string): string[] {
  return [...new Set([...text.toLowerCase()].filter((ch) => /\p{L}/u.test(ch)))]
}

/**
 * Which letters each lesson teaches, in path order: the letters of its own vocab
 * that no earlier lesson has taught, capped per lesson — leftovers move to the next
 * lesson. Deterministic per course, so progress can be derived from completions.
 */
const scheduleCache = new WeakMap<Course, Map<string, string[]>>()
export function letterSchedule(course: Course): Map<string, string[]> {
  const cached = scheduleCache.get(course)
  if (cached) return cached
  const schedule = new Map<string, string[]>()
  if (course.id === 'ru') {
    const byId = new Map(course.vocab.map((v) => [v.id, v]))
    const taught = new Set<string>()
    let backlog: string[] = []
    for (const lesson of course.units.flatMap((u) => u.skills.flatMap((s) => s.lessons))) {
      const own = lesson.vocabIds.flatMap((id) => lettersOf(byId.get(id)?.lemma ?? ''))
      const pending = [...new Set([...backlog, ...own])].filter((ch) => !taught.has(ch) && letterInfo(ch))
      const here = pending.slice(0, LETTERS_PER_LESSON)
      backlog = pending.slice(LETTERS_PER_LESSON)
      for (const ch of here) taught.add(ch)
      schedule.set(lesson.id, here)
    }
  }
  scheduleCache.set(course, schedule)
  return schedule
}

/** Letters this lesson introduces. */
export function newLetters(course: Course, lesson: Lesson): string[] {
  return letterSchedule(course).get(lesson.id) ?? []
}

/** Letters introduced by this lesson and every lesson before it in path order. */
export function lettersUpTo(course: Course, lesson: Lesson): Set<string> {
  const taught = new Set<string>()
  for (const [lessonId, letters] of letterSchedule(course)) {
    for (const ch of letters) taught.add(ch)
    if (lessonId === lesson.id) break
  }
  return taught
}

/** Letters the learner has met: from completed lessons, plus alphabet-tab groups done. */
export function lettersTaught(course: Course, completions: Completions): Set<string> {
  const taught = new Set<string>()
  for (const [lessonId, letters] of letterSchedule(course)) {
    if ((completions[lessonId] ?? 0) > 0) for (const ch of letters) taught.add(ch)
  }
  for (const g of ruAlphabet.groups) {
    if (alphabetDrillDone(`alpha-${g.id}`, completions)) for (const l of g.letters) taught.add(l.lower)
  }
  return taught
}

/**
 * The alphabet counts as learned once every letter scheduled inside the beginner
 * units has been met. Rare letters (ё, щ, ц…) first appear in later lessons and
 * still get their "New letter" intro there, but do not hold the learner back.
 */
export function alphabetDone(course: Course, completions: Completions): boolean {
  if (course.id !== 'ru') return true
  const taught = lettersTaught(course, completions)
  const schedule = letterSchedule(course)
  return course.units
    .slice(0, BEGINNER_UNITS)
    .flatMap((u) => u.skills.flatMap((s) => s.lessons))
    .every((l) => (schedule.get(l.id) ?? []).every((ch) => taught.has(ch)))
}

export function courseStage(course: Course, completions: Completions): Stage {
  if (!alphabetDone(course, completions)) return 'letters'
  const beginnerLessons = course.units.slice(0, BEGINNER_UNITS).flatMap((u) => u.skills.flatMap((s) => s.lessons))
  return beginnerLessons.every((l) => (completions[l.id] ?? 0) > 0) ? 'typing' : 'tiles'
}

/** Stage for one lesson play: the course stage, and typing only from the third pass. */
export function lessonStage(course: Course, completions: Completions, crownLevel: number): Stage {
  const byCourse = courseStage(course, completions)
  const byCrown: Stage = crownLevel >= 2 ? 'typing' : 'tiles'
  return ORDER[Math.min(ORDER.indexOf(byCourse), ORDER.indexOf(byCrown))]
}
