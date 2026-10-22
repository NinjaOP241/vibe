import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { ChatGoogle } from "@langchain/google";

import { env } from "../config/env.js";

export type GeminiThinkingLevel = typeof env.GEMINI_THINKING_LEVEL;

export interface ChatModelOptions {
  thinkingLevel?: GeminiThinkingLevel;
}

export function getChatModel(
  modelName: string,
  options: ChatModelOptions = {},
): BaseChatModel {
  return new ChatGoogle({
    model: modelName,
    apiKey: env.GEMINI_API_KEY,
    thinkingLevel: options.thinkingLevel ?? env.GEMINI_THINKING_LEVEL,
  });
}
