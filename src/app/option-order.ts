/**
 * Deterministic display order for multiple-choice options.
 *
 * Comprehension questions are authored with the correct answer first, so
 * rendering them in array order lets learners just tap the first button. A
 * seeded permutation varies the position per question while staying stable
 * across re-renders (a fresh `Math.random()` shuffle would reorder the buttons
 * under the learner's finger).
 */
export function optionOrder(seed: string, count: number): number[] {
  const order = Array.from({ length: count }, (_, i) => i)
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619)
  for (let i = count - 1; i > 0; i--) {
    h = (Math.imul(h, 1103515245) + 12345) & 0x7fffffff
    const j = h % (i + 1)
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  return order
}
