import { z } from "zod";

export const InteractionChannelSchema = z.enum([
  "in_person",
  "whatsapp",
  "call",
  "telegram",
  "email",
  "other",
]);

export const InteractionInputSchema = z.object({
  person_id: z.string().uuid(),
  date: z.string().optional(),
  channel: InteractionChannelSchema,
  notes: z.string().optional(),
});

export type InteractionInput = z.infer<typeof InteractionInputSchema>;
