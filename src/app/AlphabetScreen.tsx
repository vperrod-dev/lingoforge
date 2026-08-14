import { useState } from 'react'
import { Volume2, Check, Eye, PenLine, Zap, BookOpen } from 'lucide-react'
import { ruAlphabet, readingPractice, confusablePairs } from '../content'
import { courses } from '../content'
import type { AlphabetGroup, AlphabetLetter } from '../content/types'
import type { ExerciseInstance } from '../engine/exercise-gen'
import { spellFromWord } from '../engine/exercise-gen'
import { LessonPlayer, type LessonResult } from '../exercises/LessonPlayer'
import { renderExercise } from '../exercises/render'
import { speak } from '../audio/tts'
import { useProgress } from '../state/progress'
import { ClayButton } from '../ui/ClayButton'
import { playFanfare } from '../audio/sfx'

const TTS_LANG = 'ru-RU'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function allLetters(): AlphabetLetter[] {
  return ruAlphabet.groups.flatMap((g) => g.letters)
}

/** Distractor-tile source for spelling drills: every lowercase Cyrillic letter. */
const alphaPool = allLetters().map((l) => l.lower)

/** Level 1: Recognition — see/hear letter → pick its sound, then build the example word you hear */
function recognitionDrill(group: AlphabetGroup): ExerciseInstance[] {
  const exercises: ExerciseInstance[] = []
  const all = allLetters()

  for (const letter of group.letters) {
    const others = shuffle(all.filter((l) => l.letter !== letter.letter)).slice(0, 3)

    // Letter → Sound (core recognition)
    const soundOptions = shuffle([letter.sound, ...others.map((o) => o.sound)])
    exercises.push({
      kind: 'choice',
      prompt: `What sound does ${letter.letter} ${letter.lower} make?`,
      ttsText: letter.lower,
      options: soundOptions,
      correctIndex: soundOptions.indexOf(letter.sound),
      vocabIds: [`alpha:${letter.letter}`],
    })
  }

  // Build the example word you hear — reading + spelling from the very first level
  for (const letter of shuffle(group.letters).slice(0, 5)) {
    exercises.push(
      spellFromWord(letter.example.word, 'Spell what you hear', alphaPool, {
        audio: true,
        vocabIds: [`alpha:${letter.letter}`],
      }),
    )
  }

  return shuffle(exercises).slice(0, 14)
}

/** Level 2: Reading — hear word, pick it / transliterate words / example sentences */
function readingDrill(group: AlphabetGroup): ExerciseInstance[] {
  const exercises: ExerciseInstance[] = []
  const all = allLetters()

  for (const letter of group.letters) {
    const others = shuffle(all.filter((l) => l.letter !== letter.letter)).slice(0, 3)

    // Listen to example word, pick correct spelling
    const wordOptions = shuffle([letter.example.word, ...others.map((o) => o.example.word)])
    exercises.push({
      kind: 'listening',
      ttsText: letter.example.word,
      options: wordOptions,
      correctIndex: wordOptions.indexOf(letter.example.word),
      vocabIds: [`alpha:${letter.letter}`],
    })

    // See word, type transliteration (hint)
    exercises.push({
      kind: 'typing',
      prompt: `Transliterate: ${letter.example.word} (${letter.example.translation})`,
      accept: [letter.example.hint, letter.example.hint.toLowerCase()],
      answer: letter.example.hint,
      vocabIds: [`alpha:${letter.letter}`],
    })

    // Extra examples: spell the word from its translation (reading + spelling, not select)
    const extras = letter.extraExamples ?? []
    if (extras.length > 0) {
      const ex = extras[0]
      exercises.push(
        spellFromWord(ex.word, ex.translation, alphaPool, { vocabIds: [`alpha:${letter.letter}`] }),
      )
    }
  }

  // Add reading practice words for this group
  const words = readingPractice[group.id] ?? []
  for (const w of shuffle(words).slice(0, 3)) {
    exercises.push({
      kind: 'typing',
      prompt: `Read and transliterate: ${w.word} (${w.translation})`,
      accept: [w.hint, w.hint.toLowerCase()],
      answer: w.hint,
      vocabIds: [],
    })
  }

  return shuffle(exercises).slice(0, 16)
}

/** Level 3: Production — type the Cyrillic, confusable pairs, dictation */
function productionDrill(group: AlphabetGroup): ExerciseInstance[] {
  const exercises: ExerciseInstance[] = []

  for (const letter of group.letters) {
    // Type the letter from sound
    exercises.push({
      kind: 'typing',
      prompt: `Type the Russian letter that sounds like: ${letter.sound}`,
      accept: [letter.lower, letter.letter],
      answer: letter.lower,
      vocabIds: [`alpha:${letter.letter}`],
    })

    // Spell the example word from its translation
    exercises.push(
      spellFromWord(letter.example.word, `Spell: "${letter.example.translation}"`, alphaPool, {
        vocabIds: [`alpha:${letter.letter}`],
      }),
    )

    // Hear the word, build it from tiles. Typing a whole word is a keyboard test,
    // not an alphabet one — single letters above are the writing practice here.
    exercises.push(
      spellFromWord(letter.example.word, 'Spell what you hear', alphaPool, {
        audio: true,
        vocabIds: [`alpha:${letter.letter}`],
      }),
    )
  }

  // Add confusable pair exercises for letters in this group
  const groupLetterSet = new Set(group.letters.map((l) => l.letter))
  const relevantPairs = confusablePairs.filter((p) => groupLetterSet.has(p.a) || groupLetterSet.has(p.b))

  for (const pair of relevantPairs.slice(0, 3)) {
    const letterA = allLetters().find((l) => l.letter === pair.a)
    const letterB = allLetters().find((l) => l.letter === pair.b)
    if (!letterA || !letterB) continue

    // "Which letter makes the V sound?" with confusable pair as options
    const options = shuffle([
      `${letterA.letter} = ${letterA.sound}`,
      `${letterB.letter} = ${letterB.sound}`,
    ])
    exercises.push({
      kind: 'choice',
      prompt: `${pair.tip}\n\nWhich one makes the "${letterA.sound.split(' ')[0]}" sound?`,
      options: [...options, 'Both', 'Neither'],
      correctIndex: options.findIndex((o) => o.startsWith(letterA.letter)),
      vocabIds: [`alpha:${letterA.letter}`, `alpha:${letterB.letter}`],
    })
  }

  return shuffle(exercises).slice(0, 16)
}

/** Dedicated confusable pairs drill — mixes all tricky pairs */
function confusablesDrill(): ExerciseInstance[] {
  const exercises: ExerciseInstance[] = []
  const all = allLetters()

  for (const pair of shuffle(confusablePairs)) {
    const letterA = all.find((l) => l.letter === pair.a)
    const letterB = all.find((l) => l.letter === pair.b)
    if (!letterA || !letterB) continue

    // Pick the right letter for the sound
    exercises.push({
      kind: 'choice',
      prompt: `Which letter sounds like "${letterA.sound.split('as in')[0].trim()}"?`,
      options: shuffle([
        `${letterA.letter} ${letterA.lower}`,
        `${letterB.letter} ${letterB.lower}`,
      ]),
      correctIndex: 0,
      vocabIds: [`alpha:${letterA.letter}`],
    })

    // Reverse direction
    exercises.push({
      kind: 'choice',
      prompt: `Which letter sounds like "${letterB.sound.split('as in')[0].trim()}"?`,
      options: shuffle([
        `${letterB.letter} ${letterB.lower}`,
        `${letterA.letter} ${letterA.lower}`,
      ]),
      correctIndex: 0,
      vocabIds: [`alpha:${letterB.letter}`],
    })

    // Word with confusable: build the word you hear (forces hearing the difference)
    if (letterA.example && letterB.example) {
      exercises.push(
        spellFromWord(letterA.example.word, 'Spell what you hear', alphaPool, {
          audio: true,
          vocabIds: [`alpha:${letterA.letter}`],
        }),
      )
    }
  }

  return shuffle(exercises).slice(0, 16)
}

/** Full reading challenge — decode words from all groups */
function readingChallenge(): ExerciseInstance[] {
  const exercises: ExerciseInstance[] = []
  const allWords = Object.values(readingPractice).flat()

  for (const w of shuffle(allWords).slice(0, 8)) {
    // Transliterate
    exercises.push({
      kind: 'typing',
      prompt: `Read aloud and type the transliteration: ${w.word}`,
      accept: [w.hint, w.hint.toLowerCase()],
      answer: w.hint,
      vocabIds: [],
    })

    // Meaning
    const otherTranslations = shuffle(allWords.filter((x) => x.word !== w.word).map((x) => x.translation)).slice(0, 3)
    const meaningOptions = shuffle([w.translation, ...otherTranslations])
    exercises.push({
      kind: 'choice',
      prompt: `What does "${w.word}" mean?`,
      ttsText: w.word,
      options: meaningOptions,
      correctIndex: meaningOptions.indexOf(w.translation),
      vocabIds: [],
    })
  }

  // Dictation with full words
  for (const w of shuffle(allWords).slice(0, 4)) {
    exercises.push({
      kind: 'dictation',
      ttsText: w.word,
      accept: [w.word],
      answer: w.word,
      vocabIds: [],
    })
  }

  return shuffle(exercises).slice(0, 16)
}

type DrillMode = { type: 'group'; group: AlphabetGroup; level: 1 | 2 | 3 } | { type: 'confusables' } | { type: 'reading' }

export function AlphabetScreen() {
  const data = useProgress((s) => s.data)
  const { addXp, addStudyMinutes, completeLesson, earnBadge } = useProgress()
  const [drill, setDrill] = useState<DrillMode | null>(null)
  const [done, setDone] = useState(false)

  const completions = data.courses.ru?.lessonCompletions ?? {}

  const getDrillExercises = (mode: DrillMode): ExerciseInstance[] => {
    if (mode.type === 'confusables') return confusablesDrill()
    if (mode.type === 'reading') return readingChallenge()
    if (mode.level === 1) return recognitionDrill(mode.group)
    if (mode.level === 2) return readingDrill(mode.group)
    return productionDrill(mode.group)
  }

  const getDrillId = (mode: DrillMode): string => {
    if (mode.type === 'confusables') return 'alpha-confusables'
    if (mode.type === 'reading') return 'alpha-reading'
    return `alpha-${mode.group.id}-L${mode.level}`
  }

  if (drill) {
    const handleComplete = (r: LessonResult) => {
      const drillId = getDrillId(drill)
      completeLesson('ru', drillId, [])
      addXp(r.xp)
      addStudyMinutes(r.minutes)
      const fresh = useProgress.getState().data
      const allGroupsDone = ruAlphabet.groups.every((g) =>
        [1, 2, 3].every((lvl) => fresh.courses.ru?.lessonCompletions[`alpha-${g.id}-L${lvl}`]),
      )
      if (allGroupsDone) earnBadge('alphabet-master')
      playFanfare()
      setDone(true)
    }

    if (done) {
      return (
        <div className="flex flex-col items-center gap-6 py-12">
          <h2 className="font-display text-3xl font-bold text-primary">Отлично! Great job!</h2>
          <p className="text-fg-muted">
            {drill.type === 'group' && drill.level < 3 && `Ready for level ${drill.level + 1}?`}
            {drill.type === 'group' && drill.level === 3 && 'You crushed it! Try another group or the reading challenge.'}
            {drill.type === 'confusables' && 'Those tricky pairs are getting easier!'}
            {drill.type === 'reading' && 'You can read Cyrillic! Keep practicing to build speed.'}
          </p>
          <ClayButton variant="primary" onClick={() => { setDrill(null); setDone(false) }}>
            Back to alphabet
          </ClayButton>
        </div>
      )
    }

    return (
      <LessonPlayer
        exercises={getDrillExercises(drill)}
        ttsLang={TTS_LANG}
        renderExercise={(ex, onAnswer) => renderExercise(ex, TTS_LANG, onAnswer)}
        onComplete={handleComplete}
        onExit={() => { setDrill(null); setDone(false) }}
      />
    )
  }

  const levelIcon = (level: 1 | 2 | 3) => {
    if (level === 1) return <Eye className="size-4" aria-hidden />
    if (level === 2) return <BookOpen className="size-4" aria-hidden />
    return <PenLine className="size-4" aria-hidden />
  }

  const levelLabel = (level: 1 | 2 | 3) => {
    if (level === 1) return 'Recognize'
    if (level === 2) return 'Read'
    return 'Write'
  }

  const levelDesc = (level: 1 | 2 | 3) => {
    if (level === 1) return 'Match letters to sounds'
    if (level === 2) return 'Read words & transliterate'
    return 'Type Cyrillic from sound'
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-3xl font-bold">{courses.ru.flag} Cyrillic alphabet</h1>
        <p className="text-fg-muted">
          33 letters in 4 smart groups. 3 drill levels each: recognize → read → write.
          Tap any letter to hear it. Russian is phonetic — master these and you can read everything.
        </p>
      </header>

      {/* Special drills */}
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setDrill({ type: 'confusables' })}
          className="clay clay-press flex items-center gap-3 border-red-300 bg-red-50 p-4 text-left"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-100">
            <Zap className="size-5 text-red-600" aria-hidden />
          </span>
          <span>
            <span className="block font-display font-bold">Confusable Pairs</span>
            <span className="text-xs text-fg-muted">В/Б, Р/П, Ш/Щ, Е/Э — the tricky ones</span>
          </span>
          {completions['alpha-confusables'] && <Check className="ml-auto size-5 text-accent" />}
        </button>

        <button
          type="button"
          onClick={() => setDrill({ type: 'reading' })}
          className="clay clay-press flex items-center gap-3 border-purple-300 bg-purple-50 p-4 text-left"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-purple-100">
            <BookOpen className="size-5 text-purple-600" aria-hidden />
          </span>
          <span>
            <span className="block font-display font-bold">Reading Challenge</span>
            <span className="text-xs text-fg-muted">Decode real Russian words from all groups</span>
          </span>
          {completions['alpha-reading'] && <Check className="ml-auto size-5 text-accent" />}
        </button>
      </div>

      {/* Letter groups with 3 drill levels */}
      {ruAlphabet.groups.map((group) => (
        <section key={group.id} className="clay flex flex-col gap-4 p-5">
          <div>
            <h2 className="font-display text-xl font-bold">{group.title}</h2>
            <p className="text-sm text-fg-muted">{group.description}</p>
          </div>

          {/* 3 drill levels */}
          <div className="grid grid-cols-3 gap-2">
            {([1, 2, 3] as const).map((level) => {
              const drillId = `alpha-${group.id}-L${level}`
              const isDone = Boolean(completions[drillId])
              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => setDrill({ type: 'group', group, level })}
                  className={`clay clay-press flex flex-col items-center gap-1 p-3 ${isDone ? 'border-accent' : ''}`}
                >
                  <span className={`flex size-8 items-center justify-center rounded-full ${isDone ? 'bg-accent text-on-primary' : 'bg-primary/10 text-primary'}`}>
                    {isDone ? <Check className="size-4" /> : levelIcon(level)}
                  </span>
                  <span className="text-xs font-bold">{levelLabel(level)}</span>
                  <span className="text-center text-[10px] text-fg-muted">{levelDesc(level)}</span>
                </button>
              )
            })}
          </div>

          {/* Letter cards */}
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {group.letters.map((letter) => (
              <button
                key={letter.letter}
                type="button"
                onClick={async () => {
                  await speak(letter.lower, TTS_LANG)
                  await speak(letter.example.word, TTS_LANG)
                }}
                className="clay clay-press flex flex-col items-center gap-1 p-3"
                aria-label={`Letter ${letter.letter}, sounds like ${letter.sound}. Play audio`}
              >
                <span className="font-display text-3xl font-extrabold">
                  {letter.letter} {letter.lower}
                </span>
                <span className="text-center text-xs text-fg-muted">{letter.sound}</span>
                <span className="flex items-center gap-1 text-xs font-semibold text-primary">
                  <Volume2 className="size-3" aria-hidden />
                  {letter.example.word}
                </span>
                {letter.extraExamples && letter.extraExamples.length > 0 && (
                  <span className="text-center text-[10px] text-fg-muted">
                    +{letter.extraExamples.map((e) => e.word).join(', ')}
                  </span>
                )}
                {letter.mnemonic && (
                  <span className="text-center text-[10px] italic text-fg-muted">{letter.mnemonic}</span>
                )}
                {letter.confusables && (
                  <span className="text-[10px] font-bold text-red-500">
                    ⚠ vs {letter.confusables.join(', ')}
                  </span>
                )}
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
