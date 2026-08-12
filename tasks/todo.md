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

Shipped 2026-08-12 (`26b0040`, `a7d1f08`), live at https://lingoforge.pages.dev.

- Speaking: the phrase and its transliteration (the `hint` field the ru course
  already carried, unused until now) are always on screen, mic failures name the
  cause, the recognizer is aborted on unmount and after a 12s stall, TTS is
  silenced before listening, and a skip advances without scoring.
- Writing: Cyrillic keypad + letter-by-letter hint on typing/dictation/cloze; the
  keypad collapses for learners who do have a Russian keyboard installed. Rows are
  capped at 11 keys — the first cut overflowed a 390px viewport and clipped ф/я.
- Ramp: crown 0 lessons no longer ask for a free-typed full sentence.
- 359 tests pass (17 new), lint + tsc clean, Playwright pass on iPhone-13 and
  Pixel-7 viewports **against the deployed site**, new strings confirmed in the
  live bundle.
- Docs updated same turn: README (features, phone section, audio pipeline),
  CLAUDE.md (ScriptKeypad + speaking-degradation architecture), `os/backlog.md`.

Open call for Victor: a skipped speaking exercise costs no XP and does not mark the
word wrong. If skips should count as a miss for SRS, it's a one-line change in
`LessonPlayer.handleAnswer`.
