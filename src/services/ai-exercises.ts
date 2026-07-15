import { generateJSON } from './ollama'
import type { ExerciseInstance } from '../engine/exercise-gen'
import { sample } from '../engine/exercise-gen'

interface GeneratedVocab {
  word: string
  translation: string
  pronunciation: string
  example: string
  exampleTranslation: string
}

interface TopicVocabResponse {
  vocab: GeneratedVocab[]
}

const LANG_NAMES: Record<string, string> = {
  'ru-RU': 'Russian',
  'es-ES': 'Spanish',
}

export async function generateTopicVocab(
  topic: string,
  ttsLang: string,
  level: string = 'A2',
): Promise<GeneratedVocab[]> {
  const lang = LANG_NAMES[ttsLang] ?? 'Spanish'
  const prompt = `You are a ${lang} language tutor. Generate exactly 12 vocabulary items for the topic "${topic}" at ${level} level.

Return JSON: { "vocab": [{ "word": "the word in ${lang}", "translation": "English translation", "pronunciation": "phonetic pronunciation hint", "example": "example sentence in ${lang}", "exampleTranslation": "English translation of example" }] }

Rules:
- Use natural, common words a learner would actually need
- Include a mix of nouns, verbs, and adjectives
- Example sentences should be simple and use the word in context
- Pronunciation should help an English speaker approximate the sound`

  const result = await generateJSON<TopicVocabResponse>(prompt)
  if (!result.vocab) console.warn('Ollama topic-vocab response missing "vocab" — using empty list')
  return result.vocab ?? []
}

export function topicVocabToExercises(
  vocabItems: GeneratedVocab[],
): ExerciseInstance[] {
  if (vocabItems.length === 0) return []

  const exercises: ExerciseInstance[] = []

  // Phase 1: Recognition (choice exercises — target → English)
  for (const v of vocabItems) {
    const distractors = sample(
      vocabItems.filter((d) => d.word !== v.word),
      3,
    ).map((d) => d.translation)
    const options = sample([v.translation, ...distractors], 4)
    exercises.push({
      kind: 'choice',
      prompt: v.word,
      ttsText: v.word,
      options,
      correctIndex: options.indexOf(v.translation),
      vocabIds: [`topic:${v.word}`],
    })
  }

  // Phase 2: Reverse recognition (English → target) for half
  for (const v of sample(vocabItems, Math.ceil(vocabItems.length / 2))) {
    const distractors = sample(
      vocabItems.filter((d) => d.word !== v.word),
      3,
    ).map((d) => d.word)
    const options = sample([v.word, ...distractors], 4)
    exercises.push({
      kind: 'choice',
      prompt: v.translation,
      options,
      correctIndex: options.indexOf(v.word),
      vocabIds: [`topic:${v.word}`],
    })
  }

  // Phase 3: Typing exercises for a few
  for (const v of sample(vocabItems, Math.min(4, vocabItems.length))) {
    exercises.push({
      kind: 'typing',
      prompt: v.translation,
      accept: [v.word, v.word.toLowerCase()],
      answer: v.word,
      vocabIds: [`topic:${v.word}`],
    })
  }

  // Phase 4: Listening for a couple
  for (const v of sample(vocabItems, Math.min(3, vocabItems.length))) {
    const distractors = sample(
      vocabItems.filter((d) => d.word !== v.word),
      3,
    ).map((d) => d.word)
    const options = sample([v.word, ...distractors], 4)
    exercises.push({
      kind: 'listening',
      ttsText: v.word,
      options,
      correctIndex: options.indexOf(v.word),
      vocabIds: [`topic:${v.word}`],
    })
  }

  // Phase 5: Cloze from example sentences
  for (const v of sample(vocabItems, Math.min(3, vocabItems.length))) {
    const tokens = v.example.split(/\s+/)
    const wordLower = v.word.toLowerCase()
    const blankIndex = tokens.findIndex(
      (t) => t.toLowerCase().replace(/[¿¡?!.,;:'"«»—–-]/g, '') === wordLower,
    )
    if (blankIndex >= 0) {
      exercises.push({
        kind: 'cloze',
        tokens,
        blankIndex,
        translation: v.exampleTranslation,
        answer: tokens[blankIndex],
        vocabIds: [`topic:${v.word}`],
      })
    }
  }

  // Phase 6: Matching game
  if (vocabItems.length >= 4) {
    exercises.push({
      kind: 'matching',
      pairs: sample(vocabItems, Math.min(5, vocabItems.length)).map((v) => ({
        left: v.word,
        right: v.translation,
        vocabId: `topic:${v.word}`,
      })),
    })
  }

  return sample(exercises, Math.min(14, exercises.length))
}
