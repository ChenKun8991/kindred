import { z } from "zod";

export const RelationshipTypeSchema = z.enum([
  "partner",
  "family",
  "close_friend",
  "friend",
  "colleague",
  "acquaintance",
]);

export const GiftHistoryEntrySchema = z.object({
  date: z.string(),
  item: z.string(),
  occasion: z.string(),
  reaction: z.string().optional(),
});

export const PersonInputSchema = z.object({
  name: z.string().min(1, "Name is required"),
  nickname: z.string().optional(),
  relationship_type: RelationshipTypeSchema,
  birthday: z.string().optional(), // ISO date, year may be 0001
  first_met_date: z.string().optional(),
  first_met_context: z.string().optional(),
  location: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  instagram: z.string().optional(),
  hobbies: z.array(z.string()).optional().default([]),
  food_preferences: z.string().optional(),
  love_language: z.string().optional(),
  occupation: z.string().optional(),
  personality_notes: z.string().optional(),
  gift_history: z.array(GiftHistoryEntrySchema).optional().default([]),
  notes: z.string().optional(),
  photo_url: z.string().url().optional().or(z.literal("")),
});

export type PersonInput = z.infer<typeof PersonInputSchema>;
