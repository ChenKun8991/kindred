import { z } from "zod";

export const EventTypeSchema = z.enum([
  "birthday",
  "anniversary",
  "meetup",
  "custom",
  "reminder",
]);

export const EventInputSchema = z.object({
  person_id: z.string().uuid(),
  type: EventTypeSchema,
  title: z.string().min(1, "Title is required"),
  date: z.string(), // ISO date
  recurring: z.boolean().default(true),
  notify_days_before: z.array(z.number().int().min(0)).default([7, 3, 1]),
  notes: z.string().optional(),
});

export type EventInput = z.infer<typeof EventInputSchema>;
