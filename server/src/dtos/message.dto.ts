import { z } from "zod";

export const createMessageBodySchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Message content is required")
    .max(20_000, "Message content is too long"),
});
