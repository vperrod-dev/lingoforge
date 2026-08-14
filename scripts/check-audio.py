"""
Fail the build if anything the app can speak has no MP3.

A missing file is invisible at runtime: tts.ts silently falls back to the Web
Speech API, which produces *nothing* on a phone with no Russian voice installed.
That is how whole exercises shipped silent twice. Run from the project root,
after scripts/gen-audio.py:

    python scripts/check-audio.py

Exits non-zero and lists what is missing.
"""

import importlib.util
import sys
from pathlib import Path

spec = importlib.util.spec_from_file_location("gen_audio", Path(__file__).with_name("gen-audio.py"))
assert spec and spec.loader
gen = importlib.util.module_from_spec(spec)
sys.modules["gen_audio"] = gen
spec.loader.exec_module(gen)


def speakable() -> dict[str, set[str]]:
    """Every text a speak() call site can receive, per language."""
    out: dict[str, set[str]] = {"ru": set(), "es": set()}

    for lang, course in (("ru", "src/content/courses/ru.ts"), ("es", "src/content/courses/es.ts")):
        src = Path(course).read_text(encoding="utf-8")
        out[lang].update(gen.extract_lemmas(course))
        out[lang].update(gen.extract_forms(course))
        out[lang].update(gen.extract_phrases(src))  # lesson sentences

    letters, words = gen.extract_alphabet("src/content/courses/ru-alphabet.ts")
    out["ru"].update(letters)
    out["ru"].update(words)

    for lang, block in gen.lang_blocks("src/content/phrasebook.ts").items():
        phrases = gen.extract_phrases(block)
        out[lang].update(phrases)
        out[lang].update(w for p in phrases for w in gen.split_words(p))

    for lang, block in gen.lang_blocks("src/content/readings.ts").items():
        turns = gen.extract_dialogue_turns(block)
        bodies = gen.extract_bodies(block)
        out[lang].update(turns)
        out[lang].update(gen.extract_glossary(block))
        out[lang].update(s for b in bodies for s in gen.split_sentences(b))
        out[lang].update(w for b in bodies for w in gen.split_words(b))
        out[lang].update(w for t in turns for w in gen.split_words(t))

    return out


def main() -> int:
    failed = False
    for lang, texts in speakable().items():
        have = {p.name for p in (gen.OUT_DIR / lang).glob("*.mp3")}
        missing = sorted(t for t in texts if gen.safe_filename(t) + ".mp3" not in have)
        unreachable = sorted(n for n in have if "?" in n or "#" in n)
        print(f"{lang}: {len(texts)} speakable, {len(have)} files, {len(missing)} missing, "
              f"{len(unreachable)} unreachable by URL")
        for t in missing[:20]:
            print(f"   MISSING  {t!r}")
        for n in unreachable[:20]:
            print(f"   UNREACHABLE  {n!r}")
        if missing or unreachable:
            failed = True
    if failed:
        print("\nRun `npm run gen-audio` — shipping this would leave those exercises silent.")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
