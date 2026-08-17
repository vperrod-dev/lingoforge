import type { Course, VocabItem } from '../content/types'
import type { ExerciseInstance } from './exercise-gen'
import { blanksFor, letterPool, spellFromWord } from './exercise-gen'
import type { Stage } from './production-stage'
import { shuffle } from './seeded-random'

/**
 * Production follows the learner's stage (production-stage.ts); a text field only
 * once the course is at the typing stage AND this word is already known.
 */
export function reviewExercise(course: Course, vocab: VocabItem, stage: Stage, known: boolean): ExerciseInstance {
  const distractors = shuffle(course.vocab.filter((v) => v.id !== vocab.id)).slice(0, 3)
  // Alternate directions randomly; production for variety
  const roll = Math.random()
  if (roll < 0.4) {
    const options = shuffle([vocab.translation, ...distractors.map((d) => d.translation)])
    return {
      kind: 'choice',
      prompt: vocab.lemma,
      ttsText: vocab.lemma,
      options,
      correctIndex: options.indexOf(vocab.translation),
      vocabIds: [vocab.id],
    }
  }
  if (roll < 0.7) {
    const options = shuffle([vocab.lemma, ...distractors.map((d) => d.lemma)])
    return {
      kind: 'listening',
      ttsText: vocab.lemma,
      options,
      correctIndex: options.indexOf(vocab.lemma),
      vocabIds: [vocab.id],
    }
  }
  if (stage === 'typing' && known) {
    return {
      kind: 'typing',
      prompt: vocab.translation,
      accept: [vocab.lemma, ...(vocab.forms ?? [])],
      answer: vocab.lemma,
      vocabIds: [vocab.id],
    }
  }
  if (vocab.lemma.includes(' ')) {
    const chips = vocab.lemma.split(/\s+/)
    const distractors = shuffle(course.vocab.filter((v) => !v.lemma.includes(' ') && !chips.includes(v.lemma)))
      .slice(0, 2)
      .map((v) => v.lemma)
    return {
      kind: 'wordBank',
      sentence: vocab.lemma,
      translation: vocab.translation,
      answerChips: chips,
      distractorChips: distractors,
      vocabIds: [vocab.id],
    }
  }
  const wholeWord = stage !== 'letters' && vocab.lemma.length <= 9
  return spellFromWord(vocab.lemma, vocab.translation, letterPool(course), {
    vocabIds: [vocab.id],
    ...(wholeWord ? {} : { blanks: blanksFor(vocab.lemma) }),
  })
}

