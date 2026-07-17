# LingoForge

Fun, Duolingo-style web app for learning **Russian** and **Spanish** from English. Local-first PWA — no backend, no accounts, no cost. Progress lives in your browser (per-profile export/import included).

## Why it works (the methodology)

- **Cyrillic first** — 33 letters in 4 similarity groups (identical → false friends → new shapes → unique sounds), with mnemonics and audio drills. Russian is phonetic: read = pronounce.
- **Frequency-first vocabulary** — top words inside reusable **sentence patterns** (*Я хочу ___*, *¿Dónde está ___?*), never naked flashcards. Words are stored with their inflected forms.
- **Spaced repetition (SRS)** — every word gets FSRS-style scheduling; the Practice tab resurfaces words right before you forget them.
- **Daily loop** — review first, then one new 3–5 minute lesson. Honest active-minutes tracking (pauses when idle), daily goal ring, streaks, XP with combo multipliers, badges.

## Features

- 7 exercise types: multiple choice, word bank, listening (browser TTS), typing with tolerant checking (ё/е, Spanish accents), matching pairs, Cyrillic drills, pattern substitution
- Multiple local profiles (Netflix-style picker), each with its own courses and progress
- Stats: weekly minutes chart, 4-week streak heatmap, badges, JSON backup
- Installable PWA, mobile-first, claymorphism design, reduced-motion support

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # engine + content integrity tests
npm run build    # production build (dist/)
```

Audio uses the Web Speech API — Edge/Chrome on desktop include ru-RU and es-ES voices.

## Optional: AI lessons (Ollama)

Topic Lessons, Scenario Lessons and Point & Learn generate content with a **local
[Ollama](https://ollama.com) server** at `http://localhost:11434` (`gemma2:9b` for
text, `llava:13b` for vision — Point & Learn sends camera frames to it). This is
**off by default**: each AI screen shows an opt-in card ("Enable AI lessons"), and
the choice is stored per browser. Nothing is sent to the internet, everything else
works without Ollama, and if it isn't running you get an inline "Ollama is not
running" notice instead of a broken screen.

## Adding content

Courses are typed data in `src/content/courses/*.ts` (validated by `src/content/content.test.ts`). Add vocab/lessons/units there — no app code changes needed.
