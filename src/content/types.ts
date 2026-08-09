export type CourseId = 'ru' | 'es'

export interface VocabItem {
  id: string
  lemma: string
  translation: string
  /** Inflected forms as they appear in pattern sentences (recognition tolerance) */
  forms?: string[]
  /** Pronunciation hint, e.g. transliteration for Russian */
  hint?: string
  /** What the word literally/etymologically means, shown on flashcards */
  literal?: string
  /** Usage note (formality, false friends, roots), shown on flashcards */
  note?: string
}

export interface PatternFrame {
  id: string
  /** Frame with ___ slot, e.g. "Я хочу ___" */
  frame: string
  frameTranslation: string
  /** Vocab ids valid in the slot, with the inflected form to use */
  slots: { vocabId: string; form: string; translation: string }[]
}

export interface Sentence {
  text: string
  translation: string
  /** Vocab ids this sentence teaches/reinforces */
  vocabIds: string[]
}

export type ExerciseType =
  | 'choice'          // multiple choice translation
  | 'wordBank'        // assemble translation from chips
  | 'listening'       // TTS plays, pick or type
  | 'typing'          // free-text translation
  | 'matching'        // match pairs game
  | 'pattern'         // slot substitution in a frame

export interface Lesson {
  id: string
  title: string
  /** New vocab introduced */
  vocabIds: string[]
  patternIds?: string[]
  sentences: Sentence[]
}

export interface Skill {
  id: string
  title: string
  icon: string // lucide icon name
  lessons: Lesson[]
}

export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2'

export interface Unit {
  id: string
  title: string
  description: string
  level: CefrLevel
  /** true = roadmap shell, no content yet — shown as "coming soon", not clickable */
  locked?: boolean
  skills: Skill[]
}

export interface Course {
  id: CourseId
  name: string
  flag: string
  ttsLang: string // BCP-47 for Web Speech, e.g. 'ru-RU'
  vocab: VocabItem[]
  patterns: PatternFrame[]
  units: Unit[]
}

// ---- Reading (Readlang / LingQ style) ----

export interface ReadingQuestion {
  q: string
  options: string[]
  correctIndex: number
}

export interface DialogueTurn {
  /** Display name of the speaker, e.g. "Анна" */
  speaker: string
  text: string
  translation: string
}

export interface ReadingText {
  id: string
  title: string
  level: CefrLevel
  kind: 'story' | 'dialogue'
  /** Story body — paragraphs separated by blank lines. Used when kind === 'story'. */
  body?: string
  /** Dialogue turns. Used when kind === 'dialogue'. */
  turns?: DialogueTurn[]
  /** Full-text translation, revealable. */
  translation?: string
  /** Glosses for surface forms not in the main vocab: lowercased word → translation. */
  glossary?: Record<string, string>
  /** Comprehension questions (mostly for dialogues). */
  questions?: ReadingQuestion[]
}

// ---- Phrasebook (Loecsen style) ----

export interface Phrase {
  text: string
  translation: string
  /** If the phrase maps to a known vocab item, allow adding it to Practice. */
  vocabId?: string
}

export interface PhrasePack {
  id: string
  title: string
  icon: string // lucide icon name
  phrases: Phrase[]
}

// ---- Alphabet (Russian) ----

export interface AlphabetExample {
  word: string
  translation: string
  hint: string
  /** Where the letter appears: start, middle, end */
  position: 'start' | 'middle' | 'end'
}

export interface AlphabetLetter {
  letter: string // uppercase
  lower: string
  sound: string // approximate English sound
  /** Word example using the letter, with translation */
  example: AlphabetExample
  /** Additional examples showing letter in different word positions */
  extraExamples?: AlphabetExample[]
  mnemonic?: string
  /** Letters commonly confused with this one */
  confusables?: string[]
}

export interface AlphabetGroup {
  id: string
  title: string
  description: string
  letters: AlphabetLetter[]
}

export interface Alphabet {
  groups: AlphabetGroup[]
}
