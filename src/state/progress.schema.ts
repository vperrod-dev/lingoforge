import { z } from 'zod'

// Reusable CourseId alias so the schema matches src/content/types.ts
export const courseIdSchema = z.string()

// ---- Primitive nested objects ----

export const dayLogSchema = z.object({
  minutes: z.number(),
  xp: z.number(),
  lessons: z.number(), // lessons counted for this day
})

export const srsItemSchema = z.object({
  vocabId: z.string().min(1),
  stability: z.number(),
  difficulty: z.number(),
  dueAt: z.number(),
  reps: z.number().int().nonnegative(),
  lapses: z.number().int().nonnegative(),
})

export const courseProgressSchema = z.object({
  /** lessonId → crown level (0..5) */
  lessonCompletions: z.record(z.string(), z.number().int().nonnegative().max(5)),
  /** vocabId → spaced-repetition state */
  srsItems: z.record(z.string().min(1), srsItemSchema),
})

// ---- Top-level Progress shape ----

export const progressDataSchema = z.object({
  xp: z.number(),
  activeCourse: courseIdSchema,
  dailyGoalMinutes: z.number(),
  /** 'YYYY-MM-DD' → log */
  dailyLog: z.record(z.string(), dayLogSchema),
  badges: z.record(z.string(), z.number()),
  courses: z.partialRecord(courseIdSchema, courseProgressSchema),
})

export type ProgressData = z.infer<typeof progressDataSchema>
export type DayLog = z.infer<typeof dayLogSchema>
export type CourseProgress = z.infer<typeof courseProgressSchema>
export type SrsItem = z.infer<typeof srsItemSchema>
