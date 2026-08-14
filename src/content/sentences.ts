/**
 * Sentence split for reading passages. `scripts/gen-audio.py` generates one MP3
 * per sentence this returns, so its Python twin (`split_sentences`) must stay
 * identical — a passage that splits differently here plays nothing.
 */
export function splitSentences(body: string): string[] {
  return body
    .split(/\n+/)
    .flatMap((line) => line.split(/(?<=[.!?…])\s+/))
    .map((s) => s.trim())
    .filter(Boolean)
}

/** The tappable words in a passage, without the punctuation glued to them. */
export function splitWords(body: string): string[] {
  return body
    .split(/\s+/)
    .map((w) => w.replace(/^[^\p{L}\p{M}]+|[^\p{L}\p{M}]+$/gu, ''))
    .filter(Boolean)
}
