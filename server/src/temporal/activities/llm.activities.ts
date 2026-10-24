import { runPlainPrompt } from "../../lib/llm.js";
import { FRAGMENT_TITLE_PROMPT, RESPONSE_PROMPT } from "../../lib/prompt.js";

export async function generateTitle(summary: string): Promise<string> {
  const title = await runPlainPrompt(FRAGMENT_TITLE_PROMPT, summary);
  return title;
}

export async function generateResponse(summary: string): Promise<string> {
  const response = await runPlainPrompt(RESPONSE_PROMPT, summary);
  return response;
}
