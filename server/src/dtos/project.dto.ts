import { z } from "zod";

export const createProjectBodySchema = z.object({
  messageContent: z
    .string()
    .trim()
    .min(1, "Initial message is required")
    .max(20_000, "Initial message is too long"),
});
