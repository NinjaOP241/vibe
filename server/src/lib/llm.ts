import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { env } from "../config/env.js";
import { getChatModel } from "./model.js";

export async function runPlainPrompt(
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const model = getChatModel(env.GEMINI_MODEL);

  const response = await model.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(userPrompt),
  ]);
  const content = response.text.trim();

  if (!content) {
    throw new Error("Invalid response from LLM: empty or non-string content");
  }

  return content;
}
