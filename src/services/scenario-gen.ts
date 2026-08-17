import { generateJSON } from './ollama'
import { langName } from './lang-names'
import { capText } from './ai-text'
import type { ExerciseInstance } from '../engine/exercise-gen'
import { sample } from '../engine/seeded-random'

export interface ScenarioPhrase {
  phrase: string
  translation: string
  usage: string
}

export interface DialogueLine {
  speaker: 'you' | 'other'
  line: string
  translation: string
}

export interface ScenarioData {
  title: string
  culturalTip: string
  vocab: { word: string; translation: string; pronunciation: string }[]
  phrases: ScenarioPhrase[]
  dialogue: DialogueLine[]
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

export function isScenarioVocab(v: unknown): v is ScenarioData['vocab'][number] {
  return (
    isRecord(v) &&
    typeof v.word === 'string' &&
    typeof v.translation === 'string' &&
    typeof v.pronunciation === 'string'
  )
}

export function isScenarioPhrase(v: unknown): v is ScenarioPhrase {
  return (
    isRecord(v) &&
    typeof v.phrase === 'string' &&
    typeof v.translation === 'string' &&
    typeof v.usage === 'string'
  )
}

export function isDialogueLine(v: unknown): v is DialogueLine {
  return (
    isRecord(v) &&
    (v.speaker === 'you' || v.speaker === 'other') &&
    typeof v.line === 'string' &&
    typeof v.translation === 'string'
  )
}

function filterValid<T>(list: unknown, isValid: (v: unknown) => v is T, label: string): T[] {
  const raw = Array.isArray(list) ? list : []
  const valid = raw.filter(isValid)
  if (valid.length < raw.length) {
    console.warn(`Ollama scenario: dropped ${raw.length - valid.length} malformed "${label}" item(s)`)
  }
  return valid
}

export async function generateScenario(
  situation: string,
  ttsLang: string,
  level: string = 'A2',
  signal?: AbortSignal,
): Promise<ScenarioData> {
  const lang = langName(ttsLang)
  const prompt = `You are a ${lang} language tutor. Create a complete lesson for the situation: "${situation}" at ${level} level.

Return JSON: {
  "title": "short title for this scenario",
  "culturalTip": "one interesting cultural note about this situation in ${lang}-speaking countries",
  "vocab": [{ "word": "word in ${lang}", "translation": "English", "pronunciation": "phonetic hint" }],
  "phrases": [{ "phrase": "useful phrase in ${lang}", "translation": "English", "usage": "when to use it" }],
  "dialogue": [{ "speaker": "you" or "other", "line": "sentence in ${lang}", "translation": "English" }]
}

Rules:
- Generate 8-10 vocab items relevant to this situation
- Generate 5-6 useful phrases
- Dialogue should be 6-8 exchanges alternating between "you" and "other"
- Phrases should be practical and immediately usable
- Include polite/formal variants where relevant`

  const result = await generateJSON<Partial<ScenarioData> | null>(prompt, undefined, signal)
  const vocab = filterValid(result?.vocab, isScenarioVocab, 'vocab')
  const phrases = filterValid(result?.phrases, isScenarioPhrase, 'phrases')
  const dialogue = filterValid(result?.dialogue, isDialogueLine, 'dialogue')
  if (vocab.length === 0 && phrases.length === 0 && dialogue.length === 0) {
    throw new Error('The AI returned an unusable scenario — please try again')
  }
  return {
    title: capText(typeof result?.title === 'string' ? result.title : situation),
    culturalTip: capText(typeof result?.culturalTip === 'string' ? result.culturalTip : ''),
    vocab: vocab.map((v) => ({
      word: capText(v.word),
      translation: capText(v.translation),
      pronunciation: capText(v.pronunciation),
    })),
    phrases: phrases.map((p) => ({
      phrase: capText(p.phrase),
      translation: capText(p.translation),
      usage: capText(p.usage),
    })),
    dialogue: dialogue.map((d) => ({
      speaker: d.speaker,
      line: capText(d.line),
      translation: capText(d.translation),
    })),
  }
}

export function scenarioToExercises(
  scenario: ScenarioData,
  ttsLang: string,
): ExerciseInstance[] {
  const exercises: ExerciseInstance[] = []
  const { vocab, phrases, dialogue } = scenario

  // Phase 1: Vocab recognition (target → English)
  for (const v of vocab) {
    const distractors = sample(
      vocab.filter((d) => d.word !== v.word),
      3,
    ).map((d) => d.translation)
    const options = sample([v.translation, ...distractors], 4)
    exercises.push({
      kind: 'choice',
      prompt: v.word,
      ttsText: v.word,
      options,
      correctIndex: options.indexOf(v.translation),
      vocabIds: [`scenario:${v.word}`],
    })
  }

  // Phase 2: Phrase recognition (target → English)
  for (const p of phrases) {
    const distractors = sample(
      phrases.filter((d) => d.phrase !== p.phrase),
      3,
    ).map((d) => d.translation)
    if (distractors.length < 3) continue
    const options = sample([p.translation, ...distractors], 4)
    exercises.push({
      kind: 'choice',
      prompt: p.phrase,
      ttsText: p.phrase,
      options,
      correctIndex: options.indexOf(p.translation),
      vocabIds: [`scenario:${p.phrase}`],
    })
  }

  // Phase 3: Dialogue cloze — user fills in their lines
  const userLines = dialogue.filter((d) => d.speaker === 'you')
  for (const line of userLines) {
    const tokens = line.line.split(/\s+/)
    if (tokens.length < 2) continue
    const blankIndex = sample(tokens.map((_, i) => i), 1)[0]
    exercises.push({
      kind: 'cloze',
      tokens,
      blankIndex,
      translation: line.translation,
      answer: tokens[blankIndex],
      vocabIds: [`scenario:${line.line}`],
    })
  }

  // Phase 4: Dialogue exercise — fill in your part of the conversation
  if (dialogue.length >= 4) {
    exercises.push({
      kind: 'dialogue',
      lines: dialogue.map((d) => ({
        speaker: d.speaker,
        line: d.line,
        translation: d.translation,
      })),
      ttsLang,
    })
  }

  // Phase 5: Phrase ordering — arrange phrases in logical conversation order
  if (dialogue.length >= 4) {
    const subset = dialogue.slice(0, Math.min(5, dialogue.length))
    exercises.push({
      kind: 'phraseOrder',
      phrases: subset.map((d) => ({
        line: d.line,
        translation: d.translation,
      })),
    })
  }

  // Phase 6: Typing for key phrases
  for (const p of sample(phrases, Math.min(3, phrases.length))) {
    exercises.push({
      kind: 'typing',
      prompt: p.translation,
      accept: [p.phrase, p.phrase.toLowerCase()],
      answer: p.phrase,
      vocabIds: [`scenario:${p.phrase}`],
    })
  }

  // Phase 7: Listening for vocab
  for (const v of sample(vocab, Math.min(3, vocab.length))) {
    const distractors = sample(
      vocab.filter((d) => d.word !== v.word),
      3,
    ).map((d) => d.word)
    const options = sample([v.word, ...distractors], 4)
    exercises.push({
      kind: 'listening',
      ttsText: v.word,
      options,
      correctIndex: options.indexOf(v.word),
      vocabIds: [`scenario:${v.word}`],
    })
  }

  return sample(exercises, Math.min(16, exercises.length))
}
