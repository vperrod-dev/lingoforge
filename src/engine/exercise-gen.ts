import type { Course, Lesson, VocabItem } from '../content/types'
import { isSpeechSupported } from '../audio/stt'
import { sample, shuffle } from './seeded-random'

export type ExerciseInstance =
  | {
      kind: 'choice'
      /** What the user sees as the question */
      prompt: string
      /** Spoken text (target language) if prompt is in target language */
      ttsText?: string
      options: string[]
      correctIndex: number
      /** Vocab credited on success */
      vocabIds: string[]
    }
  | {
      kind: 'wordBank'
      sentence: string
      translation: string
      /** Chips in correct order; UI shuffles */
      answerChips: string[]
      distractorChips: string[]
      vocabIds: string[]
    }
  | {
      kind: 'listening'
      ttsText: string
      options: string[]
      correctIndex: number
      vocabIds: string[]
    }
  | {
      kind: 'typing'
      prompt: string
      /** Any of these normalized forms accepted */
      accept: string[]
      /** Shown after answer */
      answer: string
      vocabIds: string[]
    }
  | {
      kind: 'matching'
      pairs: { left: string; right: string; vocabId: string }[]
    }
  | {
      kind: 'spell'
      /** Instruction / translation shown above the tiles */
      prompt: string
      /** Target word to assemble */
      answer: string
      /** Letter tiles (answer letters + distractors); UI shuffles */
      tiles: string[]
      /** If set, the word is played aloud — makes this a listening activity too */
      ttsText?: string
      vocabIds: string[]
    }
  | {
      kind: 'pattern'
      frame: string
      frameTranslation: string
      slotTranslation: string
      options: string[]
      correctIndex: number
      vocabIds: string[]
    }
  | {
      kind: 'cloze'
      /** Whitespace-split tokens, punctuation attached */
      tokens: string[]
      blankIndex: number
      translation: string
      answer: string
      /** Present until the learner is typing: pick the word instead of spelling it. */
      options?: string[]
      vocabIds: string[]
    }
  | {
      kind: 'dictation'
      ttsText: string
      accept: string[]
      answer: string
      vocabIds: string[]
    }
  | {
      kind: 'translate'
      prompt: string
      accept: string[]
      answer: string
      vocabIds: string[]
    }
  | {
      kind: 'speak'
      ttsText: string
      /** Transliteration, so a learner who can't read the script yet can still say it */
      hint?: string
      accept: string[]
      answer: string
      vocabIds: string[]
    }
  | {
      kind: 'errorCorrection'
      /** Sentence tokens with one word swapped for a wrong form */
      tokens: string[]
      errorIndex: number
      correctToken: string
      translation: string
      vocabIds: string[]
    }
  | {
      kind: 'reorderDictation'
      sentence: string
      translation: string
      answerChips: string[]
      distractorChips: string[]
      vocabIds: string[]
    }
  | {
      kind: 'dialogue'
      lines: { speaker: 'you' | 'other'; line: string; translation: string }[]
      ttsLang: string
    }
  | {
      kind: 'phraseOrder'
      phrases: { line: string; translation: string }[]
    }

function distractorTranslations(course: Course, exclude: VocabItem, n: number): string[] {
  const pool = course.vocab.filter((v) => v.id !== exclude.id && v.translation !== exclude.translation)
  return sample([...new Set(pool.map((v) => v.translation))], n)
}

function distractorLemmas(course: Course, exclude: VocabItem, n: number): string[] {
  const pool = course.vocab.filter((v) => v.id !== exclude.id && v.lemma !== exclude.lemma)
  return sample([...new Set(pool.map((v) => v.lemma))], n)
}

/** Last-resort distractor lemma when the usual pools come up empty (tiny course) —
 *  any other lemma in the course, excluded by text rather than by vocab id/lemma. */
function anyOtherLemma(course: Course, excludeText: string): string | undefined {
  const pool = [...new Set(course.vocab.map((v) => v.lemma))].filter(
    (l) => l.toLowerCase() !== excludeText.toLowerCase(),
  )
  return pool.length > 0 ? sample(pool, 1)[0] : undefined
}

export function choiceToEnglish(course: Course, vocab: VocabItem): ExerciseInstance {
  const options = shuffle([vocab.translation, ...distractorTranslations(course, vocab, 3)])
  return {
    kind: 'choice',
    prompt: vocab.lemma,
    ttsText: vocab.lemma,
    options,
    correctIndex: options.indexOf(vocab.translation),
    vocabIds: [vocab.id],
  }
}

export function choiceToTarget(course: Course, vocab: VocabItem): ExerciseInstance {
  const options = shuffle([vocab.lemma, ...distractorLemmas(course, vocab, 3)])
  return {
    kind: 'choice',
    prompt: vocab.translation,
    options,
    correctIndex: options.indexOf(vocab.lemma),
    vocabIds: [vocab.id],
  }
}

function listeningExercise(course: Course, vocab: VocabItem): ExerciseInstance {
  const options = shuffle([vocab.lemma, ...distractorLemmas(course, vocab, 3)])
  return {
    kind: 'listening',
    ttsText: vocab.lemma,
    options,
    correctIndex: options.indexOf(vocab.lemma),
    vocabIds: [vocab.id],
  }
}

function typingExercise(vocab: VocabItem): ExerciseInstance {
  return {
    kind: 'typing',
    prompt: vocab.translation,
    accept: [vocab.lemma, ...(vocab.forms ?? [])],
    answer: vocab.lemma,
    vocabIds: [vocab.id],
  }
}

function wordBankExercise(course: Course, sentence: { text: string; translation: string; vocabIds: string[] }): ExerciseInstance {
  const chips = sentence.text.replace(/[?!.,—]/g, '').split(/\s+/).filter(Boolean)
  const chipsLower = chips.map((c) => c.toLowerCase())
  const distractors = sample(
    course.vocab.filter((v) => !chipsLower.includes(v.lemma.toLowerCase()) && !v.lemma.includes(' ')),
    Math.min(2, Math.max(0, 8 - chips.length)),
  ).map((v) => v.lemma)
  return {
    kind: 'wordBank',
    sentence: sentence.text,
    translation: sentence.translation,
    answerChips: chips,
    distractorChips: distractors,
    vocabIds: sentence.vocabIds,
  }
}

function clozeExercise(
  course: Course,
  sentence: { text: string; translation: string; vocabIds: string[] },
  typed: boolean,
): ExerciseInstance {
  const tokens = sentence.text.split(/\s+/)
  const candidates = tokens
    .map((t, i) => ({ t, i }))
    .filter(({ t }) => t.replace(/[¿¡?!.,;:'"«»—–-]/g, '').length >= 3)
  const pick = candidates.length > 0 ? sample(candidates, 1)[0] : { t: tokens[0], i: 0 }
  const distractors = sample(
    course.vocab.filter((v) => !v.lemma.includes(' ') && v.lemma.toLowerCase() !== pick.t.toLowerCase()),
    3,
  ).map((v) => v.lemma)
  return {
    kind: 'cloze',
    tokens,
    blankIndex: pick.i,
    translation: sentence.translation,
    answer: pick.t,
    ...(typed ? {} : { options: shuffle([pick.t, ...distractors]) }),
    vocabIds: sentence.vocabIds,
  }
}

function dictationExercise(sentence: { text: string; translation: string; vocabIds: string[] }): ExerciseInstance {
  return {
    kind: 'dictation',
    ttsText: sentence.text,
    accept: [sentence.text],
    answer: sentence.text,
    vocabIds: sentence.vocabIds,
  }
}

function translateExercise(sentence: { text: string; translation: string; vocabIds: string[] }): ExerciseInstance {
  return {
    kind: 'translate',
    prompt: sentence.translation,
    accept: [sentence.text],
    answer: sentence.text,
    vocabIds: sentence.vocabIds,
  }
}

/** Unique letters used across a course's vocab — the distractor-tile source for spelling. */
export function letterPool(course: Course): string[] {
  const set = new Set<string>()
  for (const v of course.vocab) {
    for (const ch of v.lemma.toLowerCase()) {
      if (/\p{L}/u.test(ch)) set.add(ch)
    }
  }
  return [...set]
}

/**
 * Build a "spell the word from letter tiles" exercise. Reusable by lessons and the
 * alphabet screen. `pool` supplies distractor letters; `audio` makes it a listening drill.
 */
export function spellFromWord(
  word: string,
  prompt: string,
  pool: string[],
  opts: { audio?: boolean; vocabIds?: string[] } = {},
): ExerciseInstance {
  const answer = word.toLowerCase()
  const letters = [...answer].filter((ch) => /\p{L}/u.test(ch))
  const distractors = sample(pool.filter((ch) => !letters.includes(ch)), Math.min(3, pool.length))
  return {
    kind: 'spell',
    prompt,
    answer,
    tiles: shuffle([...letters, ...distractors]),
    ...(opts.audio ? { ttsText: answer } : {}),
    vocabIds: opts.vocabIds ?? [],
  }
}

function spellExercise(vocab: VocabItem, pool: string[], audio = false): ExerciseInstance {
  return spellFromWord(vocab.lemma, audio ? 'Spell what you hear' : vocab.translation, pool, {
    audio,
    vocabIds: [vocab.id],
  })
}

/**
 * Single-token words short enough to assemble from tiles without becoming tedious.
 * Before the learner is typing, tiles are the only production tool there is, so the
 * length cap is relaxed rather than falling through to a keyboard.
 */
function isSpellable(vocab: VocabItem, maxLength = 9): boolean {
  return !vocab.lemma.includes(' ') && vocab.lemma.length <= maxLength
}

function speakExercise(vocab: VocabItem): ExerciseInstance {
  return {
    kind: 'speak',
    ttsText: vocab.lemma,
    ...(vocab.hint ? { hint: vocab.hint } : {}),
    accept: [vocab.lemma, ...(vocab.forms ?? [])],
    answer: vocab.lemma,
    vocabIds: [vocab.id],
  }
}

function splitPunctuation(token: string): { core: string; suffix: string } {
  const match = token.match(/^(.*?)([¿¡?!.,;:'"«»—–-]*)$/)
  return { core: match?.[1] ?? token, suffix: match?.[2] ?? '' }
}

/**
 * Returns null when the course is too small to produce any wrong-word swap
 * (no alternate form and no other lemma anywhere in the course) — callers should
 * skip this exercise for the sentence rather than render a broken swap.
 */
export function errorCorrectionExercise(
  course: Course,
  sentence: { text: string; translation: string; vocabIds: string[] },
): ExerciseInstance | null {
  const tokens = sentence.text.split(/\s+/)
  const vocabInSentence = sentence.vocabIds
    .map((id) => course.vocab.find((v) => v.id === id))
    .filter((v): v is VocabItem => Boolean(v))

  const candidates = tokens
    .map((t, i) => ({ i, core: splitPunctuation(t).core }))
    .map(({ i, core }) => ({
      i,
      core,
      vocab: vocabInSentence.find(
        (v) =>
          v.lemma.toLowerCase() === core.toLowerCase() ||
          (v.forms ?? []).some((f) => f.toLowerCase() === core.toLowerCase()),
      ),
    }))
    .filter((c) => c.vocab)

  const pick = candidates.length > 0 ? sample(candidates, 1)[0] : null
  // No vocab-backed candidate: fall back to a token that actually contains a
  // letter. A raw random index can land on a punctuation-only token, whose core
  // is empty — the exercise would then ask the learner to spot a swap in "".
  const wordTokens = tokens
    .map((t, i) => ({ i, core: splitPunctuation(t).core }))
    .filter((t) => /\p{L}/u.test(t.core))
  if (!pick && wordTokens.length === 0) return null
  const errorIndex = pick?.i ?? sample(wordTokens, 1)[0].i
  const original = tokens[errorIndex]
  const { core, suffix } = splitPunctuation(original)

  let wrongCore: string | undefined
  if (pick?.vocab) {
    const altForms = [pick.vocab.lemma, ...(pick.vocab.forms ?? [])].filter(
      (f) => f.toLowerCase() !== core.toLowerCase(),
    )
    wrongCore = altForms.length > 0 ? sample(altForms, 1)[0] : distractorLemmas(course, pick.vocab, 1)[0]
  } else {
    wrongCore = anyOtherLemma(course, core)
  }
  wrongCore ??= anyOtherLemma(course, core)
  // Course has no other lemma at all (or only alt-forms of `core` itself) — no
  // swap is possible, so there's no valid errorCorrection exercise to build.
  if (!wrongCore) return null

  const swapped = [...tokens]
  swapped[errorIndex] = wrongCore + suffix

  return {
    kind: 'errorCorrection',
    tokens: swapped,
    errorIndex,
    correctToken: original,
    translation: sentence.translation,
    vocabIds: sentence.vocabIds,
  }
}

export function reorderDictationExercise(
  course: Course,
  sentence: { text: string; translation: string; vocabIds: string[] },
): ExerciseInstance {
  const chips = sentence.text.replace(/[?!.,—]/g, '').split(/\s+/).filter(Boolean)
  const chipsLower = chips.map((c) => c.toLowerCase())
  const distractors = sample(
    course.vocab.filter((v) => !chipsLower.includes(v.lemma.toLowerCase()) && !v.lemma.includes(' ')),
    Math.min(2, Math.max(0, 8 - chips.length)),
  ).map((v) => v.lemma)
  return {
    kind: 'reorderDictation',
    sentence: sentence.text,
    translation: sentence.translation,
    answerChips: chips,
    distractorChips: distractors,
    vocabIds: sentence.vocabIds,
  }
}

/**
 * Teaching order for a first pass: meet the word, then recognise it, then build
 * it from pieces, and only then produce it from nothing. Shuffling everything
 * meant a beginner's very first exercise could be "type this in Cyrillic" for a
 * word the lesson had not shown yet.
 */
const TEACHING_ORDER: ExerciseInstance['kind'][] = [
  'choice',
  'listening',
  'matching',
  'pattern',
  'spell',
  'wordBank',
  'phraseOrder',
  'dialogue',
  'cloze',
  'errorCorrection',
  'reorderDictation',
  'speak',
  'dictation',
  'typing',
  'translate',
]

/**
 * Trim to `total` while keeping the activity mix varied: no single kind may exceed its
 * cap, so "select the word" (choice/listening) can't dominate the way it used to.
 * `ordered` sorts what survives into TEACHING_ORDER instead of leaving it shuffled.
 */
function capByKind(exercises: ExerciseInstance[], total: number, ordered = false): ExerciseInstance[] {
  const caps: Partial<Record<ExerciseInstance['kind'], number>> = {
    choice: 4, // recognition intros — capped so they don't flood the lesson
    listening: 2, // the only "pick what you hear" select; rest of listening is spell/dictation
    pattern: 2,
  }
  const counts = new Map<string, number>()
  const kept: ExerciseInstance[] = []
  for (const ex of shuffle(exercises)) {
    const cap = caps[ex.kind] ?? 3
    const n = counts.get(ex.kind) ?? 0
    if (n >= cap) continue
    counts.set(ex.kind, n + 1)
    kept.push(ex)
  }
  const chosen = shuffle(kept).slice(0, total)
  if (!ordered) return chosen
  return [...chosen].sort(
    (a, b) => TEACHING_ORDER.indexOf(a.kind) - TEACHING_ORDER.indexOf(b.kind),
  )
}

export function generateLessonExercises(course: Course, lesson: Lesson, crownLevel: number): ExerciseInstance[] {
  const vocab = lesson.vocabIds
    .map((id) => course.vocab.find((v) => v.id === id))
    .filter((v): v is VocabItem => Boolean(v))

  const pool = letterPool(course)
  const spellable = vocab.filter((v) => isSpellable(v))
  const exercises: ExerciseInstance[] = []

  // A beginner has no business free-typing a foreign script: until the third pass
  // through a lesson, production means assembling letter tiles and word chips.
  // Typing arrives only once the words are already familiar.
  const typingAllowed = crownLevel >= 2

  // New vocab intro: one recognition per word teaches meaning (capped later)
  for (const v of vocab) {
    exercises.push(choiceToEnglish(course, v))
  }
  // Production: tiles for anything that fits, typing only once it's allowed
  const productionSet = crownLevel >= 2 ? vocab : sample(vocab, Math.ceil(vocab.length / 2))
  for (const v of productionSet) {
    if (crownLevel < 3 && isSpellable(v, typingAllowed ? 9 : 14)) exercises.push(spellExercise(v, pool))
    else if (typingAllowed) exercises.push(typingExercise(v))
    // A multi-word lemma with no keyboard yet: build it from word chips.
    else exercises.push(wordBankExercise(course, { text: v.lemma, translation: v.translation, vocabIds: [v.id] }))
  }
  // Listening, mostly non-select: one "what do you hear", plus spell-from-audio + dictation
  for (const v of sample(vocab, Math.min(1, vocab.length))) {
    exercises.push(listeningExercise(course, v))
  }
  for (const v of sample(spellable, Math.min(2, spellable.length))) {
    exercises.push(spellExercise(v, pool, true))
  }
  // Dictation is typing a whole sentence in a new script from sound alone — the
  // hardest thing in the lesson, so it waits for the typing stage.
  if (typingAllowed) {
    for (const s of sample(lesson.sentences, Math.min(2, lesson.sentences.length))) {
      exercises.push(dictationExercise(s))
    }
  }
  // Sentences as word banks
  for (const s of sample(lesson.sentences, Math.min(2, lesson.sentences.length))) {
    exercises.push(wordBankExercise(course, s))
  }
  // Fill-in-the-blank
  for (const s of sample(lesson.sentences, Math.min(2, lesson.sentences.length))) {
    exercises.push(clozeExercise(course, s, typingAllowed))
  }
  // Free translate: full-sentence production. Typing a whole sentence in an
  // unfamiliar script on first contact is punishing, so the first pass through a
  // lesson builds sentences from the word bank instead.
  if (typingAllowed) {
    for (const s of sample(lesson.sentences, Math.min(1, lesson.sentences.length))) {
      exercises.push(translateExercise(s))
    }
  }
  // Speak-back: pronunciation practice, only where the browser supports speech recognition
  if (isSpeechSupported()) {
    for (const v of sample(vocab, Math.min(2, vocab.length))) {
      exercises.push(speakExercise(v))
    }
  }
  // Error correction: spot the wrong word (null when the course is too small to swap in a wrong form)
  for (const s of sample(lesson.sentences, Math.min(1, lesson.sentences.length))) {
    const errorCorrection = errorCorrectionExercise(course, s)
    if (errorCorrection) exercises.push(errorCorrection)
  }
  // Reorder dictation: hear it, arrange it (no transcript shown)
  for (const s of sample(lesson.sentences, Math.min(1, lesson.sentences.length))) {
    exercises.push(reorderDictationExercise(course, s))
  }
  // Pattern drills
  for (const pid of lesson.patternIds ?? []) {
    const pattern = course.patterns.find((p) => p.id === pid)
    if (!pattern || pattern.slots.length < 2) continue
    for (const slot of sample(pattern.slots, 2)) {
      const otherForms = sample(
        pattern.slots.filter((s) => s.vocabId !== slot.vocabId),
        3,
      ).map((s) => s.form)
      const options = shuffle([slot.form, ...otherForms])
      exercises.push({
        kind: 'pattern',
        frame: pattern.frame,
        frameTranslation: pattern.frameTranslation,
        slotTranslation: slot.translation,
        options,
        correctIndex: options.indexOf(slot.form),
        vocabIds: [slot.vocabId],
      })
    }
  }
  // One matching game if enough vocab
  if (vocab.length >= 4) {
    exercises.push({
      kind: 'matching',
      pairs: sample(vocab, Math.min(5, vocab.length)).map((v) => ({
        left: v.lemma,
        right: v.translation,
        vocabId: v.id,
      })),
    })
  }

  return capByKind(exercises, 14, crownLevel === 0)
}
