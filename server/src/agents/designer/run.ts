import { createAgent } from "langchain";

import { env } from "../../config/env.js";
import { getChatModel } from "../../lib/model.js";

import type { DesignerInput, DesignerResult } from "../types.js";
import { DESIGNER_PROMPT } from "./prompt.js";
import { lastAssistantText, streamAgentValues } from "../shared/langchain.js";
import { appendAgentMessage } from "../shared/handoff.js";
import { formatDesignStepsForDesignerAgent } from "./format-design-steps.js";

export async function runDesigner(
  input: DesignerInput,
): Promise<DesignerResult> {
  // Create the designer agent
  const agent = createAgent({
    name: "designer",
    model: getChatModel(env.GEMINI_DESIGNER_MODEL),
    tools: [],
    systemPrompt: DESIGNER_PROMPT,
    version: "v1",
    signal: input.signal,
  });

  const history = input.thread;
  const designSteps = formatDesignStepsForDesignerAgent(input.todos);

  const baseContext = history.length
    ? [
        `User Request:\n${input.prompt}`,
        `Thread so far:\n${history.map((msg) => `${msg.role}: ${msg.content}`).join("\n\n")}`,
      ].join("\n\n")
    : input.prompt;

  const contextTillNow = designSteps
    ? [baseContext, designSteps].join("\n\n")
    : baseContext;

  const agentInput = {
    messages: [
      {
        role: "user",
        content: contextTillNow,
      },
    ],
  };

  const stream = await agent.stream(agentInput, {
    streamMode: "values",
    recursionLimit: 8,
  });

  const { messages: finalMessages } = await streamAgentValues(stream, {
    onProgress: input.onProgress,
  });

  console.log("[runDesigner] Final messages:", finalMessages);

  const designNotes =
    lastAssistantText(finalMessages) ||
    "[Hardcoded] Design created by the agent for the project";

  await input.onTodos?.([], {
    agent: "designer",
    detail: "Design created by the agent for the project",
  });

  const thread = appendAgentMessage(input.thread, "designer", designNotes);

  return {
    design: designNotes,
    thread,
  };
}
