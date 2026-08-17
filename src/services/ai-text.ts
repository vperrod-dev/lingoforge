// AI replies feed straight into on-screen text (choice options, cloze tokens,
// matching tiles) — cap them instead of trusting a verbose or malformed reply.
export const MAX_TEXT_LENGTH = 300
export const capText = (s: string) => (s.length > MAX_TEXT_LENGTH ? s.slice(0, MAX_TEXT_LENGTH) : s)
