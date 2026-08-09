const LANG_NAMES: Record<string, string> = {
  'ru-RU': 'Russian',
  'es-ES': 'Spanish',
}

/**
 * Full language name for a course's ttsLang (e.g. 'ru-RU' → 'Russian'), used in AI
 * prompts. Throws on an unmapped ttsLang instead of silently defaulting to a wrong
 * language — add the new course's ttsLang here when it's introduced.
 */
export function langName(ttsLang: string): string {
  const name = LANG_NAMES[ttsLang]
  if (!name) throw new Error(`No language name mapped for ttsLang "${ttsLang}" — add it to lang-names.ts`)
  return name
}
