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
