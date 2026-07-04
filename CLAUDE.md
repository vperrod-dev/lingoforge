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
- Audio = Web Speech API TTS only (deliberately no external audio API — keeps it
  local-first); pre-generated MP3s via `npm run gen-audio`.

## Conventions

- Local-first is a hard constraint: no backend, no external APIs, no accounts.
- New content must extend the `content.test.ts` integrity checks.
- Verify UI changes with a Playwright smoke pass across affected routes.

## Agentic OS

- Registry entry: `lingoforge` in `claude-config/os/registry.yaml` (autonomy: `report-only`)
- Cross-project backlog: `claude-config/os/backlog.md` under `## LingoForge`
- Working tasks: `tasks/todo.md` · Lessons after corrections: `tasks/lessons.md`
- At session start, check the registry entry and this project's backlog section.
