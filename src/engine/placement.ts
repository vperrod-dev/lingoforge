import type { Course, Unit, VocabItem } from '../content/types'
import type { ExerciseInstance } from './exercise-gen'
import { choiceToEnglish, choiceToTarget } from './exercise-gen'
import { sample } from './seeded-random'

const QUESTIONS_PER_UNIT = 3
/** Ratio of a unit's questions that must be correct to count as "passed" */
const PASS_RATIO = 0.7

function unitVocab(course: Course, unit: Unit): VocabItem[] {
  const ids = new Set(unit.skills.flatMap((s) => s.lessons.flatMap((l) => l.vocabIds)))
  return course.vocab.filter((v) => ids.has(v.id))
}

/** Per-unit question counts, in unit order, for the unlocked (authored) units only */
export function getUnitQuestionCounts(course: Course): number[] {
  return course.units.filter((u) => !u.locked).map((unit) => Math.min(QUESTIONS_PER_UNIT, unitVocab(course, unit).length))
}

/** Quiz questions sampled across all unlocked units, easiest unit first */
export function generatePlacementQuiz(course: Course): ExerciseInstance[] {
  return course.units
    .filter((u) => !u.locked)
    .flatMap((unit) => {
      const picks = sample(unitVocab(course, unit), Math.min(QUESTIONS_PER_UNIT, unitVocab(course, unit).length))
      return picks.map((v) => (Math.random() < 0.5 ? choiceToEnglish(course, v) : choiceToTarget(course, v)))
    })
}

/**
 * Walks units in order; a unit "passes" when its question-block is ≥70% correct.
 * Returns the index of the first unit that did NOT pass (i.e. where the user should
 * resume), or `unitBoundaries.length` if every unit passed.
 */
export function scorePlacement(answers: boolean[], unitBoundaries: number[]): number {
  let offset = 0
  for (let u = 0; u < unitBoundaries.length; u++) {
    const count = unitBoundaries[u]
    const correct = answers.slice(offset, offset + count).filter(Boolean).length
    if (count === 0 || correct / count < PASS_RATIO) return u
    offset += count
  }
  return unitBoundaries.length
}
