# Phone: speaking exercises broken + writing too hard (2026-08-12)

Reported by Victor from his phone: speaking exercises "have issues", and typing
Russian is brutal for a beginner (no Cyrillic keyboard on a phone).

## Speaking — why it fails on a phone

- `SpeakExercise` never shows what to say; it only speaks it. On mobile the
  autoplay policy blocks TTS on mount → silent prompt, nothing on screen.
- Every failure path is silent: unsupported browser (`if (!rec) return`), denied
  mic permission, `no-speech`, `network`, `service-not-allowed` — the mic button
  just does nothing.
- No way out: the mic is the only answer path, so a failing mic strands the
  learner mid-lesson (exit = lose the lesson).
- Recognizer is never stopped/aborted (no `stop`/`abort` in the wrapper), so it
  keeps the mic open across exercises; a second `start()` throws InvalidStateError.
- Recognition starts while the TTS is still speaking → mic hears the app.

## Tasks

- [x] `stt.ts`: expose `stop`/`abort`/`onstart`, typed error codes, `continuous=false`
- [x] `tts.ts`: `stopSpeaking()` (cancel mp3 + speechSynthesis) so the mic doesn't hear us
- [x] `SpeakExercise`: show the phrase, per-error messages, retry, unmount cleanup, 12s guard
- [x] Skip path: `onAnswer(correct, answer, { skipped: true })` → LessonPlayer advances,
      no score, no re-queue (no churn across the 6 renderExercise call sites)
- [x] `ScriptKeypad`: on-screen Cyrillic (ru) / accent row (es) under every typed answer
- [x] Hint button (reveal next letter) on typing, dictation, cloze
- [x] Ramp: no free-typed full-sentence `translate` at crown 0 (word bank covers it)
- [x] Tests: skip flow, keypad, hint, ramp
- [x] lint + vitest + Playwright mobile smoke
- [x] Deploy + verify on the live URL

## Review

Shipped 2026-08-12, live at https://lingoforge.pages.dev.

- Speaking: prompt text now always visible, mic failures name the cause and offer
  Try again / Skip, recognizer aborted on unmount, TTS silenced before listening.
- Writing: Cyrillic keypad + hint on typing/dictation/cloze; keypad is collapsible
  for learners who do have a Russian keyboard installed.
- Ramp: crown 0 lessons no longer ask for a free-typed full sentence.
- 100 tests pass (14 new), lint clean, Playwright smoke on a 390×844 viewport.
