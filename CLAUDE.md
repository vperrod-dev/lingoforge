# LingoForge

Duolingo-style web app for learning Russian and Spanish from English. Local-first
PWA — no backend, no accounts, no cost; progress lives in the browser (per-profile
export/import). React 19 + Vite + TypeScript + Tailwind v4 + Zustand.

## Commands

```bash
npm install
npm run lint         # eslint (must pass before commit)
npm test             # vitest — engine + content integrity tests (must pass before push)
npm run dev          # http://localhost:5173
npm run build        # tsc -b && vite build → dist/
npm run gen-audio    # pre-generate MP3s (python scripts/gen-audio.py)
```

## Architecture

- **`src/engine/`** — the learning core: FSRS-style SRS scheduling, exercise
  generation (`exercise-gen.ts` — 7+ activity kinds with a `capByKind` balance cap
  so multiple-choice can never dominate), `word-status.ts` (SRS → new/learning/known).
- **`src/content/`** — courses, readings, phrasebook, grammar notes; keyed by id,
  seeded ru + es. Integrity-checked by `content.test.ts`.
- **`src/exercises/`** + `render.tsx` — one component per activity kind (choice,
  word bank, listening, typing with tolerant checking, matching, spell, pattern).
- **`src/app/`** — screens (Path, Lesson, Alphabet drills, Reading, Phrasebook,
  Practice, Stats); routes wired in `App.tsx`.
- **`src/ui/GlossText.tsx`** — shared tap-to-translate text (reading/dialogue/phrasebook).
- **`src/ui/ScriptKeypad.tsx`** — on-screen Cyrillic / Spanish-accent keys under every
  typed answer. A phone has no Russian keyboard until one is installed, so without
  this every typed Russian answer is a dead end. Typed exercises also carry a Hint
  button that reveals the answer one letter at a time.
- Speaking degrades instead of blocking: `SpeakExercise` shows the phrase and its
  transliteration (never audio-only — phones block autoplay), names the cause of
  every mic failure (`speechErrorMessage` in `src/audio/stt.ts`), and always offers
  a skip, which reaches `LessonPlayer` as `onAnswer(_, _, { skipped: true })` and
  advances without scoring or re-queueing.
- Audio = pre-generated MP3s (`npm run gen-audio`, run by `scripts/deploy.sh`)
  with the Web Speech API as fallback — deliberately no external audio API.
  `safeText()` in `src/audio/tts.ts` must stay identical to `safe_filename()` in
  `scripts/gen-audio.py`: `?` and `#` are legal in a filename but start the
  query/fragment in a URL, so a file named `Где метро?.mp3` can never be
  fetched. Every text the app can speak — vocab, forms, **lesson sentences**,
  alphabet, phrasebook, readings — needs an entry in `gen-audio.py`, or that
  exercise is silent on any phone without a Russian/Spanish voice installed.
- `src/ui/AudioPrompt.tsx` (big, listen-first exercises) and `src/ui/SpeakerButton.tsx`
  (every inline 🔊) are the only ways to play audio in the UI — never call `speak()`
  from a bare `<button>`. `speak()` resolves false when the device made no sound and
  both surfaces say so, so a phone with no Russian voice can't leave an exercise
  looking broken. `scripts/check-audio.py` runs in `deploy.sh` and fails the build if
  any speakable text lacks an MP3; `splitSentences`/`splitWords` in
  `src/content/sentences.ts` have Python twins there and must stay in sync.
- Production before typing: `typingAllowed` in `exercise-gen.ts` is `crownLevel >= 2`.
  Below that, production means letter tiles (`spell`) and word chips (`wordBank`,
  cloze `options`) — never a text input. Practice (`ReviewScreen`) applies the same
  rule per word via `wordStatus(...) === 'known'`.
- First pass through a lesson (`crownLevel === 0`) is ordered, not shuffled:
  `TEACHING_ORDER` in `exercise-gen.ts` puts recognition before production.

## Conventions

- Local-first is a hard constraint: no backend, no external APIs, no accounts.
  One deliberate exception: the AI lessons (`src/services/ollama.ts` + topic/
  scenario/point-learn screens) call a **local** Ollama server at
  `localhost:11434` — vision sends camera frames to it. Gated behind the
  `aiEnabled` setting (`src/state/settings.ts`, default **off**); screens show
  an opt-in card when off and a graceful "Ollama is not running" notice when
  it's unreachable. See README "Optional: AI lessons (Ollama)".
- New content must extend the `content.test.ts` integrity checks.
- Verify UI changes with a Playwright smoke pass across affected routes.

## Agentic OS

- Registry entry: `lingoforge` in `claude-config/os/registry.yaml` (autonomy: `report-only`)
- Cross-project backlog: `claude-config/os/backlog.md` under `## LingoForge`
- Working tasks: `tasks/todo.md` · Lessons after corrections: `tasks/lessons.md`
- At session start, check the registry entry and this project's backlog section.
