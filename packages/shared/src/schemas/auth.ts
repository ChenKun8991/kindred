import { z } from "zod";

export const TelegramAuthPayloadSchema = z.object({
  id: z.number(),
  first_name: z.string(),
  username: z.string().optional(),
  photo_url: z.string().optional(),
  auth_date: z.number(),
  hash: z.string(),
});

export type TelegramAuthPayload = z.infer<typeof TelegramAuthPayloadSchema>;
