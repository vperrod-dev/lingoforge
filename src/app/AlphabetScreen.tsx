import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { Volume2, Check, Eye, Zap, BookOpen } from 'lucide-react'
import { ruAlphabet, readingPractice, confusablePairs } from '../content'
import { courses } from '../content'
import type { AlphabetGroup, AlphabetLetter } from '../content/types'
import type { ExerciseInstance } from '../engine/exercise-gen'
import { blanksFor, spellFromWord } from '../engine/exercise-gen'
import { alphabetDone, alphabetDrillDone } from '../engine/production-stage'
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

/** Pick-one over the group's letters/words: choice/listening/spell only, never a text field. */
function letterChoice(letter: AlphabetLetter, all: AlphabetLetter[]): ExerciseInstance[] {
  const others = shuffle(all.filter((l) => l.letter !== letter.letter)).slice(0, 3)
  const soundOptions = shuffle([letter.sound, ...others.map((o) => o.sound)])
  const letterOptions = shuffle([letter, ...others].map((l) => `${l.letter} ${l.lower}`))
  const wordOptions = shuffle([letter.example.word, ...others.map((o) => o.example.word)])
  const hintOptions = shuffle([letter.example.hint, ...others.map((o) => o.example.hint)])
  return [
    // Letter → sound
    {
      kind: 'choice',
      title: 'Letters',
      prompt: `What sound does ${letter.letter} ${letter.lower} make?`,
      ttsText: letter.lower,
      options: soundOptions,
      correctIndex: soundOptions.indexOf(letter.sound),
      vocabIds: [`alpha:${letter.letter}`],
    },
    // Sound → letter (writing practice without a keyboard)
    {
      kind: 'choice',
      title: 'Letters',
      prompt: `Which letter sounds like "${letter.sound}"?`,
      options: letterOptions,
      correctIndex: letterOptions.indexOf(`${letter.letter} ${letter.lower}`),
      vocabIds: [`alpha:${letter.letter}`],
    },
    // Hear the example word, pick its spelling
    {
      kind: 'listening',
      ttsText: letter.example.word,
      options: wordOptions,
      correctIndex: wordOptions.indexOf(letter.example.word),
      vocabIds: [`alpha:${letter.letter}`],
    },
    // Read the word, pick how it sounds
    {
      kind: 'choice',
      title: 'Read it',
      prompt: `How do you read ${letter.example.word} (${letter.example.translation})?`,
      ttsText: letter.example.word,
      options: hintOptions,
      correctIndex: hintOptions.indexOf(letter.example.hint),
      vocabIds: [`alpha:${letter.letter}`],
    },
    // Complete the example word: the new letter is one of the blanks
    spellFromWord(letter.example.word, letter.example.translation, alphaPool, {
      blanks: blanksFor(letter.example.word),
      vocabIds: [`alpha:${letter.letter}`],
    }),
  ]
}

/** One drill per group: meet each letter, hear it, read it, complete a word with it. */
function groupDrill(group: AlphabetGroup): ExerciseInstance[] {
  const all = allLetters()
  // Every letter gets its letter→sound question plus one other angle, so a big
  // group still covers all its letters inside one sitting.
  const exercises = group.letters.flatMap((letter) => {
    const [core, ...rest] = letterChoice(letter, all)
    return [core, shuffle(rest)[0]]
  })
  const words = readingPractice[group.id] ?? []
  for (const w of shuffle(words).slice(0, 3)) {
    const otherHints = shuffle(words.filter((x) => x.word !== w.word).map((x) => x.hint)).slice(0, 3)
    const options = shuffle([w.hint, ...otherHints])
    exercises.push({
      kind: 'choice',
      title: 'Read it',
      prompt: `Read: ${w.word} (${w.translation})`,
      ttsText: w.word,
      options,
      correctIndex: options.indexOf(w.hint),
      vocabIds: [],
    })
  }
  return shuffle(exercises).slice(0, 20)
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
      title: 'Letters',
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
      title: 'Letters',
      prompt: `Which letter sounds like "${letterB.sound.split('as in')[0].trim()}"?`,
      options: shuffle([
        `${letterB.letter} ${letterB.lower}`,
        `${letterA.letter} ${letterA.lower}`,
      ]),
      correctIndex: 0,
      vocabIds: [`alpha:${letterB.letter}`],
    })

    // Word with confusable: complete the word you hear (forces hearing the difference)
    exercises.push(
      spellFromWord(letterA.example.word, letterA.example.translation, alphaPool, {
        audio: true,
        blanks: blanksFor(letterA.example.word),
        vocabIds: [`alpha:${letterA.letter}`],
      }),
    )
  }

  return shuffle(exercises).slice(0, 16)
}

/** Full reading challenge — decode words from all groups */
function readingChallenge(): ExerciseInstance[] {
  const exercises: ExerciseInstance[] = []
  const allWords = Object.values(readingPractice).flat()

  for (const w of shuffle(allWords).slice(0, 8)) {
    // Read it: pick how it sounds
    const otherHints = shuffle(allWords.filter((x) => x.word !== w.word).map((x) => x.hint)).slice(0, 3)
    const hintOptions = shuffle([w.hint, ...otherHints])
    exercises.push({
      kind: 'choice',
      title: 'Read it',
      prompt: `Read: ${w.word}`,
      options: hintOptions,
      correctIndex: hintOptions.indexOf(w.hint),
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

  // Hear a word, build it from tiles
  for (const w of shuffle(allWords).slice(0, 4)) {
    exercises.push(spellFromWord(w.word, w.translation, alphaPool, { audio: true }))
  }

  return shuffle(exercises).slice(0, 16)
}

type DrillMode = { type: 'group'; group: AlphabetGroup } | { type: 'confusables' } | { type: 'reading' }

function drillId(mode: DrillMode): string {
  if (mode.type === 'confusables') return 'alpha-confusables'
  if (mode.type === 'reading') return 'alpha-reading'
  return `alpha-${mode.group.id}`
}

function drillFromId(id: string | undefined): DrillMode | null {
  if (!id) return null
  if (id === 'alpha-confusables') return { type: 'confusables' }
  if (id === 'alpha-reading') return { type: 'reading' }
  const group = ruAlphabet.groups.find((g) => `alpha-${g.id}` === id)
  return group ? { type: 'group', group } : null
}

export function AlphabetScreen() {
  const { drillId: routeDrillId } = useParams<{ drillId?: string }>()
  const navigate = useNavigate()
  const data = useProgress((s) => s.data)
  const { addXp, addStudyMinutes, completeLesson, earnBadge } = useProgress()
  const [drill, setDrill] = useState<DrillMode | null>(() => drillFromId(routeDrillId))
  const [done, setDone] = useState(false)

  const completions = data.courses.ru?.lessonCompletions ?? {}
  const isDone = (id: string) => alphabetDrillDone(id, completions)

  const getDrillExercises = (mode: DrillMode): ExerciseInstance[] => {
    if (mode.type === 'confusables') return confusablesDrill()
    if (mode.type === 'reading') return readingChallenge()
    return groupDrill(mode.group)
  }

  const closeDrill = () => {
    setDrill(null)
    setDone(false)
    // A drill opened from the path returns to the path
    if (routeDrillId) navigate('/')
  }

  if (drill) {
    const handleComplete = (r: LessonResult) => {
      completeLesson('ru', drillId(drill), [])
      addXp(r.xp)
      addStudyMinutes(r.minutes)
      const fresh = useProgress.getState().data.courses.ru?.lessonCompletions ?? {}
      if (alphabetDone(courses.ru, fresh)) earnBadge('alphabet-master')
      playFanfare()
      setDone(true)
    }

    if (done) {
      return (
        <div className="flex flex-col items-center gap-6 py-12">
          <h2 className="font-display text-3xl font-bold text-primary">Отлично! Great job!</h2>
          <p className="text-fg-muted">
            {drill.type === 'group' && 'One group closer to reading Russian.'}
            {drill.type === 'confusables' && 'Those tricky pairs are getting easier!'}
            {drill.type === 'reading' && 'You can read Cyrillic! Keep practicing to build speed.'}
          </p>
          <ClayButton variant="primary" onClick={closeDrill}>
            {routeDrillId ? 'Back to the path' : 'Back to alphabet'}
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
        onExit={closeDrill}
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-3xl font-bold">{courses.ru.flag} Cyrillic alphabet</h1>
        <p className="text-fg-muted">
          33 letters in 4 smart groups. Your lessons teach them a few at a time — this tab is
          for extra practice. Tap any letter to hear it.
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
          {isDone('alpha-confusables') && <Check className="ml-auto size-5 text-accent" />}
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
          {isDone('alpha-reading') && <Check className="ml-auto size-5 text-accent" />}
        </button>
      </div>

      {/* Letter groups, one drill each */}
      {ruAlphabet.groups.map((group) => {
        const groupDone = isDone(`alpha-${group.id}`)
        return (
          <section key={group.id} className="clay flex flex-col gap-4 p-5">
            <div>
              <h2 className="font-display text-xl font-bold">{group.title}</h2>
              <p className="text-sm text-fg-muted">{group.description}</p>
            </div>

            <ClayButton
              variant={groupDone ? 'neutral' : 'primary'}
              className="flex items-center justify-center gap-2"
              onClick={() => setDrill({ type: 'group', group })}
            >
              {groupDone ? <><Check className="size-4" aria-hidden /> Practice again</> : <><Eye className="size-4" aria-hidden /> Learn these letters</>}
            </ClayButton>

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
        )
      })}
    </div>
  )
}
