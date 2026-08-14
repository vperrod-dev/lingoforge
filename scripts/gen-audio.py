"""
Generate MP3 audio files for all LingoForge content using edge-tts neural voices.
Run from the project root: python scripts/gen-audio.py

Files saved to public/audio/{lang}/{safe_text}.mp3
  safe_text = text with '/' and '\\' replaced by '-' and '?'/'#' dropped
              (they are legal in filenames but unfetchable in a URL)
tts.ts uses the same safeText() transformation, no percent-encoding.
When the browser fetches the URL, it auto-encodes Unicode → server decodes → matches file.

Coverage:
  - course vocab lemmas + inflected forms (from courses/*.ts)
  - course lesson sentences (from courses/*.ts) — dictation, reorder-dictation,
    word bank and cloze all speak whole sentences
  - Russian alphabet letters + example words (from ru-alphabet.ts)
  - phrasebook phrases (from phrasebook.ts) — the 🔊 button on each phrase
  - reading glossary words (from readings.ts) — inline tap-to-hear fallback for
    surface forms not in the course vocab
  - reading dialogue turns (from readings.ts) — the per-line 🔊 in a dialogue
"""

import asyncio
import re
import sys
from pathlib import Path

import edge_tts

# Windows consoles default to cp1252 which can't print Cyrillic
sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[attr-defined]

VOICES = {
    "ru": "ru-RU-SvetlanaNeural",
    "es": "es-ES-ElviraNeural",
}

OUT_DIR = Path("public/audio")


def safe_filename(text: str) -> str:
    """Make text safe for use in a path *and* in a URL.

    '?' and '#' are legal in a filename but start the query/fragment in a URL, so
    a file named 'Где метро?.mp3' can never be fetched — the browser asks for
    'Где метро' and gets the SPA's index.html back. Dropping them keeps the URL
    whole; the synthesized speech is unaffected (edge-tts reads the real text).
    """
    return (
        text.replace("/", "-")
        .replace("\\", "-")
        .replace("?", "")
        .replace("#", "")
    )


# ---- course vocab / alphabet extractors (existing) ----

def extract_lemmas(ts_path: str) -> list[str]:
    text = Path(ts_path).read_text(encoding="utf-8")
    return re.findall(r"lemma:\s*['\"]([^'\"]+)['\"]", text)


def extract_forms(ts_path: str) -> list[str]:
    text = Path(ts_path).read_text(encoding="utf-8")
    matches = re.findall(r"forms:\s*\[([^\]]+)\]", text)
    words = []
    for m in matches:
        words.extend(re.findall(r"['\"]([^'\"]+)['\"]", m))
    return words


def extract_alphabet(ts_path: str) -> tuple[list[str], list[str]]:
    text = Path(ts_path).read_text(encoding="utf-8")
    letters = re.findall(r"letter:\s*['\"]([^'\"]+)['\"]", text)
    lowers = re.findall(r"lower:\s*['\"]([^'\"]+)['\"]", text)
    words = re.findall(r"word:\s*['\"]([^'\"]+)['\"]", text)
    return list(set(letters + lowers)), words


# ---- reading / phrasebook extractors (new) ----

def lang_blocks(ts_path: str) -> dict[str, str]:
    """Split a `Record<CourseId, ...>` source file into per-language text blocks."""
    text = Path(ts_path).read_text(encoding="utf-8")
    headers = [(m.group(1), m.start()) for m in re.finditer(r"\n\s*(ru|es):\s*\[", text)]
    blocks: dict[str, str] = {}
    for i, (lang, pos) in enumerate(headers):
        begin = text.find("[", pos)
        end = headers[i + 1][1] if i + 1 < len(headers) else len(text)
        blocks[lang] = text[begin:end]
    return blocks


def _unescape(s: str) -> str:
    return s.replace("\\'", "'").replace("\\\\", "\\")


def extract_phrases(block: str) -> list[str]:
    """Phrase text (from phrasebook.ts): `text: '...'` — handles \\' escapes ('Let\\'s go.')."""
    return [_unescape(m) for m in re.findall(r"text:\s*'((?:\\.|[^'\\])+)'", block)]


def extract_dialogue_turns(block: str) -> list[str]:
    """Dialogue turn text (from readings.ts): `text: '...'` inside a turn."""
    return extract_phrases(block)


def extract_glossary(block: str) -> list[str]:
    """Glossary surface words (from readings.ts): `glossary: { 'word': 'meaning', ... }`."""
    keys: list[str] = []
    for gb in re.findall(r"glossary:\s*\{([^}]*)\}", block):
        keys.extend(re.findall(r"'([^']+)':", gb))
    return keys


async def generate(text: str, voice: str, out_dir: Path) -> None:
    out_path = out_dir / (safe_filename(text) + ".mp3")
    if out_path.exists() and out_path.stat().st_size > 0:
        return
    try:
        communicate = edge_tts.Communicate(text, voice)
        await communicate.save(str(out_path))
        print(f"  OK  {out_path.name}")
    except Exception as e:
        print(f"  SKIP  {text!r}  ({e})")


async def generate_batch(texts: list[str], lang: str) -> None:
    voice = VOICES[lang]
    out_dir = OUT_DIR / lang
    out_dir.mkdir(parents=True, exist_ok=True)
    sem = asyncio.Semaphore(4)  # cap concurrent edge-tts requests to avoid rate limiting

    async def throttled(text: str) -> None:
        async with sem:
            await generate(text, voice, out_dir)

    await asyncio.gather(*[throttled(t) for t in texts])


async def main() -> None:
    print("=== LingoForge audio generation ===\n")

    ru_texts = list(dict.fromkeys(
        extract_lemmas("src/content/courses/ru.ts")
        + extract_forms("src/content/courses/ru.ts")
        + extract_phrases(Path("src/content/courses/ru.ts").read_text(encoding="utf-8"))
        + extract_alphabet("src/content/courses/ru-alphabet.ts")[0]
        + extract_alphabet("src/content/courses/ru-alphabet.ts")[1]
    ))
    print(f"Russian (vocab + sentences + alphabet): {len(ru_texts)} unique texts")
    await generate_batch(ru_texts, "ru")

    es_texts = list(dict.fromkeys(
        extract_lemmas("src/content/courses/es.ts")
        + extract_forms("src/content/courses/es.ts")
        + extract_phrases(Path("src/content/courses/es.ts").read_text(encoding="utf-8"))
    ))
    print(f"\nSpanish (vocab + sentences): {len(es_texts)} unique texts")
    await generate_batch(es_texts, "es")

    # Phrasebook phrases (per-language)
    pb_blocks = lang_blocks("src/content/phrasebook.ts")
    for lang, block in pb_blocks.items():
        texts = list(dict.fromkeys(extract_phrases(block)))
        print(f"\n{lang} phrasebook phrases: {len(texts)}")
        await generate_batch(texts, lang)

    # Reading glossary words + dialogue turns (per-language)
    rd_blocks = lang_blocks("src/content/readings.ts")
    for lang, block in rd_blocks.items():
        glossary = list(dict.fromkeys(extract_glossary(block)))
        turns = list(dict.fromkeys(extract_dialogue_turns(block)))
        print(f"\n{lang} reading glossary words: {len(glossary)}")
        await generate_batch(glossary, lang)
        print(f"{lang} reading dialogue turns: {len(turns)}")
        await generate_batch(turns, lang)

    print(f"\nDone. Files in {OUT_DIR}/")


if __name__ == "__main__":
    asyncio.run(main())
