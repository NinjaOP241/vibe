import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  API_PORT: z.coerce.number().int().positive().default(3001),

  DATABASE_URL: z.url(),

  // Temporal
  TEMPORAL_ADDRESS: z.string().default("localhost:7233"),
  TEMPORAL_NAMESPACE: z.string().default("default"),
  TEMPORAL_TASK_QUEUE: z.string().trim().min(1).default("coding-agent"),

  // Gemini API
  GEMINI_API_KEY: z.string().trim().min(1),

  // Default model configurations
  GEMINI_MODEL: z.string().trim().min(1).default("gemini-3.6-flash"),
  GEMINI_FAST_MODEL: z.string().trim().min(1).default("gemini-3.5-flash-lite"),
  GEMINI_REASONING_MODEL: z.string().trim().min(1).default("gemini-3.8-flash"),

  // Specialized agent models
  GEMINI_PLANNER_MODEL: z.string().trim().min(1).default("gemini-3.8-flash"),
  GEMINI_DESIGNER_MODEL: z.string().trim().min(1).default("gemini-3.6-flash"),
  GEMINI_BUILDER_MODEL: z.string().trim().min(1).default("gemini-3.6-flash"),
  GEMINI_REVIEWER_MODEL: z.string().trim().min(1).default("gemini-3.8-flash"),

  // Model thinking configuration
  GEMINI_THINKING_LEVEL: z.enum(["low", "medium", "high"]).default("medium"),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error("Invalid environment variables:");
  console.error(result.error.issues);
  process.exit(1);
}

export const env = result.data;
