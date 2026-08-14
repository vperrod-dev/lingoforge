# LingoForge

Fun, Duolingo-style web app for learning **Russian** and **Spanish** from English. Local-first PWA — no backend, no accounts, no cost. Progress lives in your browser (per-profile export/import included).

## Why it works (the methodology)

- **Cyrillic first** — 33 letters in 4 similarity groups (identical → false friends → new shapes → unique sounds), with mnemonics and audio drills. Russian is phonetic: read = pronounce.
- **Frequency-first vocabulary** — top words inside reusable **sentence patterns** (*Я хочу ___*, *¿Dónde está ___?*), never naked flashcards. Words are stored with their inflected forms.
- **Spaced repetition (SRS)** — every word gets FSRS-style scheduling; the Practice tab resurfaces words right before you forget them.
- **Daily loop** — review first, then one new 3–5 minute lesson. Honest active-minutes tracking (pauses when idle), daily goal ring, streaks, XP with combo multipliers, badges.

## Features

- 15 exercise types: multiple choice, word bank, listening, spell-from-tiles, typing with tolerant checking (ё/е, Spanish accents), dictation, free translation, fill-in-the-blank, matching pairs, error correction, sentence reordering, pattern substitution, dialogue, phrase ordering, speak-back
- Multiple local profiles (Netflix-style picker), each with its own courses and progress
- Stats: weekly minutes chart, 4-week streak heatmap, badges, JSON backup
- Installable PWA, mobile-first, claymorphism design, reduced-motion support

### On a phone

The two things that make a phone harder than a laptop are handled explicitly:

- **Typing a script you don't have a keyboard for.** Every typed answer carries an
  on-screen keypad — Cyrillic for Russian, the accented letters for Spanish — so
  you never need to install a system keyboard. It collapses if you already have
  one. A **Hint** button reveals the answer a letter at a time — and early on you
  aren't asked to type at all (see "Order" below).
- **Speaking.** Speech recognition is patchy on mobile: a browser may not have it,
  permission may be denied, the service may be unreachable. The word to say is
  always shown with its transliteration (never audio-only — phones block autoplay),
  every failure says what went wrong, and "Can't speak now — skip" moves you on
  without scoring the word wrong.
- **Hearing.** Every speakable text is a pre-generated neural-voice MP3, including
  whole lesson sentences; the browser's own voices are only a fallback. If the
  device still makes no sound — no Russian voice installed, silent switch on —
  tapping the speaker reveals the text instead of leaving you stuck on an
  exercise you cannot hear.
- **Order, and no keyboard until you're ready.** A first pass through a lesson is
  sequenced, not shuffled: you meet a word, then recognise it, then build it from
  letter tiles and word chips. Nothing asks you to type the script from a blank
  field until the third pass through that lesson (and in Practice, not until the
  word is mature) — production early on is assembling, not typing.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # engine + content integrity tests
npm run build    # production build (dist/)
```

Audio plays pre-generated MP3s and falls back to the Web Speech API when a phrase
has no file (Edge/Chrome on desktop include ru-RU and es-ES voices). No audio is
committed — `scripts/deploy.sh` runs `npm run gen-audio` to synthesize
`public/audio/` on every deploy, so a local `npm run dev` uses the browser voices.
`scripts/check-audio.py` then fails the deploy if anything the app can speak has
no file: on a phone without a Russian voice that fallback is silence, not speech.

## Optional: AI lessons (Ollama)

Topic Lessons, Scenario Lessons and Point & Learn generate content with a **local
[Ollama](https://ollama.com) server** at `http://localhost:11434` (`gemma2:9b` for
text, `llava:13b` for vision — Point & Learn sends camera frames to it). This is
**off by default**: each AI screen shows an opt-in card ("Enable AI lessons"), and
the choice is stored per browser. Nothing is sent to the internet, everything else
works without Ollama, and if it isn't running you get an inline "Ollama is not
running" notice instead of a broken screen.

To point a build at a remote Ollama instance (LAN device, self-hosted server)
instead of `localhost:11434`, set `VITE_OLLAMA_URL` before `npm run build` —
it's baked into both the client code and the CSP `connect-src` at build time.

## Adding content

Courses are typed data in `src/content/courses/*.ts` (validated by `src/content/content.test.ts`). Add vocab/lessons/units there — no app code changes needed.
