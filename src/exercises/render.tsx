import type { ExerciseInstance } from '../engine/exercise-gen'
import { ChoiceExercise } from './ChoiceExercise'
import { WordBankExercise } from './WordBankExercise'
import { ListeningExercise } from './ListeningExercise'
import { TypingExercise } from './TypingExercise'
import { MatchingExercise } from './MatchingExercise'
import { PatternExercise } from './PatternExercise'
import { ClozeExercise } from './ClozeExercise'
import { DictationExercise } from './DictationExercise'
import { SpeakExercise } from './SpeakExercise'
import { ErrorCorrectionExercise } from './ErrorCorrectionExercise'
import { ReorderDictationExercise } from './ReorderDictationExercise'
import { DialogueExercise } from './DialogueExercise'
import { PhraseOrderExercise } from './PhraseOrderExercise'
import { SpellExercise } from './SpellExercise'

export function renderExercise(
  exercise: ExerciseInstance,
  ttsLang: string,
  onAnswer: (correct: boolean, correctAnswer: string, opts?: { skipped?: boolean }) => void,
) {
  switch (exercise.kind) {
    case 'choice':
      return (
        <ChoiceExercise
          title={exercise.ttsText ? 'What does this mean?' : 'Pick the translation'}
          prompt={exercise.prompt}
          ttsText={exercise.ttsText}
          ttsLang={ttsLang}
          options={exercise.options}
          correctIndex={exercise.correctIndex}
          onAnswer={onAnswer}
        />
      )
    case 'wordBank':
      return (
        <WordBankExercise
          sentence={exercise.sentence}
          translation={exercise.translation}
          answerChips={exercise.answerChips}
          distractorChips={exercise.distractorChips}
          ttsLang={ttsLang}
          onAnswer={onAnswer}
        />
      )
    case 'listening':
      return (
        <ListeningExercise
          ttsText={exercise.ttsText}
          ttsLang={ttsLang}
          options={exercise.options}
          correctIndex={exercise.correctIndex}
          onAnswer={onAnswer}
        />
      )
    case 'typing':
      return (
        <TypingExercise
          prompt={exercise.prompt}
          accept={exercise.accept}
          answer={exercise.answer}
          ttsLang={ttsLang}
          onAnswer={onAnswer}
        />
      )
    case 'matching':
      return <MatchingExercise pairs={exercise.pairs} onAnswer={onAnswer} />
    case 'cloze':
      return (
        <ClozeExercise
          tokens={exercise.tokens}
          blankIndex={exercise.blankIndex}
          translation={exercise.translation}
          answer={exercise.answer}
          options={exercise.options}
          ttsLang={ttsLang}
          onAnswer={onAnswer}
        />
      )
    case 'dictation':
      return (
        <DictationExercise
          ttsText={exercise.ttsText}
          ttsLang={ttsLang}
          accept={exercise.accept}
          answer={exercise.answer}
          onAnswer={onAnswer}
        />
      )
    case 'translate':
      return (
        <TypingExercise
          prompt={exercise.prompt}
          accept={exercise.accept}
          answer={exercise.answer}
          ttsLang={ttsLang}
          onAnswer={onAnswer}
        />
      )
    case 'speak':
      return (
        <SpeakExercise
          ttsText={exercise.ttsText}
          hint={exercise.hint}
          ttsLang={ttsLang}
          accept={exercise.accept}
          answer={exercise.answer}
          onAnswer={onAnswer}
        />
      )
    case 'errorCorrection':
      return (
        <ErrorCorrectionExercise
          tokens={exercise.tokens}
          errorIndex={exercise.errorIndex}
          correctToken={exercise.correctToken}
          translation={exercise.translation}
          onAnswer={onAnswer}
        />
      )
    case 'reorderDictation':
      return (
        <ReorderDictationExercise
          sentence={exercise.sentence}
          ttsLang={ttsLang}
          answerChips={exercise.answerChips}
          distractorChips={exercise.distractorChips}
          onAnswer={onAnswer}
        />
      )
    case 'pattern':
      return (
        <PatternExercise
          frame={exercise.frame}
          frameTranslation={exercise.frameTranslation}
          slotTranslation={exercise.slotTranslation}
          options={exercise.options}
          correctIndex={exercise.correctIndex}
          onAnswer={onAnswer}
        />
      )
    case 'dialogue':
      return (
        <DialogueExercise
          lines={exercise.lines}
          ttsLang={exercise.ttsLang}
          onAnswer={onAnswer}
        />
      )
    case 'phraseOrder':
      return (
        <PhraseOrderExercise
          phrases={exercise.phrases}
          onAnswer={onAnswer}
        />
      )
    case 'spell':
      return (
        <SpellExercise
          prompt={exercise.prompt}
          answer={exercise.answer}
          tiles={exercise.tiles}
          ttsText={exercise.ttsText}
          ttsLang={ttsLang}
          onAnswer={onAnswer}
        />
      )
  }
}
