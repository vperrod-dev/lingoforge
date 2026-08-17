import { describe, expect, it } from 'vitest'
import { courses } from '../content'
import { ALPHABET_DRILL_IDS, alphabetDone, courseStage, lessonStage } from './production-stage'

const ru = courses.ru
const alphabet = Object.fromEntries(ALPHABET_DRILL_IDS.map((id) => [id, 1]))
const beginnerUnits = Object.fromEntries(
  ru.units.slice(0, 2).flatMap((u) => u.skills.flatMap((s) => s.lessons.map((l) => [l.id, 1]))),
)

describe('courseStage', () => {
  it('starts a Russian learner at letters', () => {
    expect(courseStage(ru, {})).toBe('letters')
  })

  it('moves to tiles once every alphabet drill is done', () => {
    expect(courseStage(ru, alphabet)).toBe('tiles')
  })

  it('accepts the older per-level alphabet drill ids', () => {
    const legacy = Object.fromEntries(ALPHABET_DRILL_IDS.map((id) => [`${id}-L1`, 1]))
    expect(alphabetDone('ru', legacy)).toBe(true)
  })

  it('stays at letters when the beginner units are done but the alphabet is not', () => {
    expect(courseStage(ru, beginnerUnits)).toBe('letters')
  })

  it('reaches typing only with the alphabet and units 1–2 complete', () => {
    expect(courseStage(ru, { ...alphabet, ...beginnerUnits })).toBe('typing')
  })

  it('starts Spanish (Latin script) at tiles', () => {
    expect(courseStage(courses.es, {})).toBe('tiles')
  })
})

describe('lessonStage', () => {
  it('never lets replays beat the course stage', () => {
    expect(lessonStage(ru, {}, 5)).toBe('letters')
    expect(lessonStage(ru, alphabet, 5)).toBe('tiles')
  })

  it('needs a third pass before typing even at the typing stage', () => {
    const done = { ...alphabet, ...beginnerUnits }
    expect(lessonStage(ru, done, 1)).toBe('tiles')
    expect(lessonStage(ru, done, 2)).toBe('typing')
  })
})
