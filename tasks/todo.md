# Round 4 — 2026-08-17: beginners never write whole words; alphabet is Unit 0

Complaint (3rd time): "guessing a letter or two is ok, not writing whole words in
beginner lessons — and the alphabet learning isn't incorporated at all".

- [x] `src/engine/production-stage.ts`: `letters` / `tiles` / `typing` from alphabet + units 1–2, never from replays
- [x] `spellFromWord({ blanks })` + `SpellExercise` `shown` mask — "Complete the word" (≤ 2 blanks)
- [x] `generateLessonExercises(course, lesson, crown, stage)`; letters = missing letters + chips only
- [x] Practice (`review-exercise.ts`): typing only at typing stage AND known; multi-word → chips
- [x] Alphabet screen: one drill per group + confusables, no text inputs; deep-link `/alphabet/:drillId`
- [x] PathScreen: Unit 0 "The Cyrillic alphabet" (5 nodes) before "First words"; banner until done
- [x] AI topic/scenario generators take `stage`; dialogue typing-stage only; keypad in Dialogue
- [x] Tests: production-stage, exercise-gen ramp by stage, no-typing-early (all beginner lessons × crowns × Practice), AI generators
- [x] Playwright walk (390×844): letters/tiles stages zero inputs; typing appears at typing stage crown 2 (u2s2l1)
- [x] deploy + verify live (https://lingoforge.pages.dev, walk: 240 beginner exercises / 0 inputs)
- [x] memory + os/backlog

# Phone round 3 (2026-08-14, same day)

Victor re-tested after round 2: "still a lot of the audios doesn't work, I press
and there is no sound" and "I am just learning russian, I cannot be putting full
words in writing until more advanced — these exercises should be focus on
learning and this is not the way".

## What was still wrong

- **FlashcardsScreen had its own `speak()`** using the Web Speech API directly,
  bypassing the MP3 pipeline entirely — the "Flashcards by topic ... with audio"
  card on the home path was silent on a phone with no Russian voice, every time.
- **Tapped words in readings/phrasebook** were spoken with their punctuation
  attached (`чай.`), which matches no file; only glossary keys had MP3s at all,
  so most tappable words fell back to Web Speech.
- **The reading "Listen" button** spoke the whole passage as one string — a file
  that never existed. It now plays the generated per-sentence MP3s in order.
- **Nothing said when audio failed** outside the three exercises fixed in round 2.
- **Typing was still everywhere**: multi-word or >9-letter vocab went straight to
  a text input at crown 0, Practice had a flat 30% chance of a typing exercise for
  any word including brand-new ones, and the alphabet "Write" drill asked for a
  whole word typed from audio.

## Tasks

- [x] FlashcardsScreen: use the shared `speak()` (MP3 first)
- [x] `SpeakerButton`: one component for every inline 🔊, reports silence
- [x] GlossText: strip punctuation before speaking a tapped word
- [x] ReadingScreen: play a passage sentence by sentence
- [x] gen-audio: reading sentences, every tappable reading/phrasebook word
- [x] `scripts/check-audio.py` + wired into `deploy.sh` — build fails on a missing MP3
- [x] `typingAllowed = crownLevel >= 2`: tiles and chips below that, cloze gets options
- [x] Practice: tiles unless the word is already mature (`wordStatus === 'known'`)
- [x] Alphabet "Write": spell-from-audio instead of typing a whole word
- [x] Tests incl. a DOM test that a first-pass lesson renders zero text inputs
- [x] Deploy + verify on the live URL

---

# Phone round 2: silent audio, typing too early, no visible way out (2026-08-14)

Reported by Victor from his phone, after the 2026-08-12 fixes shipped: the first
lesson still asks a beginner to type Russian with no help, the listening
exercise's audio doesn't play, and there is no button back home during a lesson —
"only option is closing the app completely".

## What was actually wrong

- **Audio.** `scripts/gen-audio.py` never generated lesson *sentences* — 195/200
  Russian and 205/209 Spanish sentences had no MP3, so dictation, reorder-dictation,
  word bank and cloze all fell through to the Web Speech API. A phone with no
  Russian voice installed hears nothing, and nothing on screen says so.
- **Audio, second cause.** 35 generated files had `?`/`#` in the name (`Где метро?.mp3`).
  Legal in a filename, but they start the query/fragment in a URL: the browser
  requested `/audio/ru/Где метро` and got the SPA shell back with a 200, so the
  `<audio>` element errored out. Verified on the live site.
- **Typing too early.** `capByKind` shuffled the whole lesson, so a beginner's very
  first exercise could be "fill in the blank" in Cyrillic for a word the lesson
  had not shown yet. Confirmed on the live site: exercise #1 was a cloze.
  Dictation (type a whole sentence from sound alone) also ran at crown 0.
- **Way out.** The exit control existed and worked — a bare unlabelled ✕ at the
  top-left of the lesson. Discoverability, not absence.

## Tasks

- [x] `gen-audio.py`: generate course lesson sentences (ru + es)
- [x] `gen-audio.py` + `tts.ts`: drop `?`/`#` from audio filenames, identically on both sides
- [x] Delete the 35 unfetchable MP3s and regenerate — 0 missing, 0 unfetchable
- [x] `speak()` resolves false when the device made no sound (no voice / error / never started)
- [x] `AudioPrompt`: shared replay button that reveals the text when a tap stays silent
- [x] `exercise-gen`: `TEACHING_ORDER` sequences the first pass; dictation moves to crown ≥ 1
- [x] `LessonPlayer`: label the exit button "Exit" instead of a bare ✕
- [x] Tests: audio URL safety, AudioPrompt silence path, crown-0 ordering + no dictation
- [x] lint + tsc + vitest, Playwright walk on a Pixel-7 viewport
- [x] Deploy + verify on the live URL

## Review

Shipped 2026-08-14, live at https://lingoforge.pages.dev.

- Audio coverage went from 883 to 1283 MP3s: every sentence the app can speak now
  has one, and no filename is unfetchable. `safeText()` and `safe_filename()` are
  documented as a matched pair — they must change together.
- Silence is now visible: `speak()` reports whether anything was heard, and the
  listening / dictation / reorder-dictation exercises reveal the text after a tap
  that produced no sound. Autoplay on mount is deliberately not treated as
  failure — phones block it, so only a failed tap counts.
- First pass is sequenced: 4 × "what does this mean" → listening → matching →
  spell → word bank → cloze, verified on a Pixel-7 viewport. Typed production
  now always comes after the word has been met.
- Exit reads "✕ Exit" in the lesson header.
- 370 tests pass (8 new), lint + tsc clean.

Note for Victor: `vite preview` 404s any audio filename containing a comma
(`Нет, спасибо..mp3`). Cloudflare Pages and `python -m http.server` both serve it
correctly, so it's a quirk of the local preview server only — no fix needed.
