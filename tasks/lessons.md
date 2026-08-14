# Lessons

## 2026-06-12 — Preselected toggle = UX trap automation can't catch
Profile creation had Russian preselected as a toggle button. Real users tap it
to "choose" it → deselects → submit stays disabled with no explanation.
Automated E2E missed it because the script toggled the OTHER option on.

Rules:
- Never preselect multi-select toggle options on first-run forms. Empty start,
  tap = select.
- Any disabled primary button must say WHY it is disabled (live helper text).
- When testing forms, include the "user taps what is already selected" path.

## 2026-08-14 — "Fixed" the mechanism, not the experience
The 08-12 phone fix added a Cyrillic keypad and a Hint button, then called
typing "solved". Victor came back with the same complaint. Playing the real
first lesson on a phone viewport took ten minutes and showed why: exercise #1
was a Cyrillic fill-in-the-blank for a word the lesson had not shown yet. The
tool was there; the *sequence* was the problem.

Rules:
- Finish a bug report by playing the actual flow end to end on the reported
  device size, not by confirming the new control renders.
- A fallback that is silent (Web Speech with no voice installed) is a broken
  feature, not a degraded one. Make failure visible in the UI and assert it.
- Content pipelines fail by omission: when adding a content kind, check the
  generator's extractor list covers it — nothing errors when audio is missing.

## 2026-08-14 (same day, round 3) — one bypass undoes a whole pipeline
Round 2 fixed the MP3 pipeline and the report came back unchanged. Two reasons:
`FlashcardsScreen` had its own private `speak()` on the Web Speech API, so the
pipeline fix never reached the screen Victor was tapping; and the fix had been
verified on the exercises that were reported, not on every speaker in the app.

Rules:
- When fixing a shared mechanism, grep for every call site *and* for private
  reimplementations of it (`grep -rn "speechSynthesis\|new Audio"`), then funnel
  them through one component so the next fix can't miss a screen.
- Enumerate the full input set a feature can receive and check it mechanically
  (`scripts/check-audio.py`), rather than spot-checking the reported case.
- "Beginner-friendly" is about what the exercise *asks for*, not what help it
  offers. A keypad and a hint do not make free-typing a foreign script
  appropriate for someone on their first lesson.
