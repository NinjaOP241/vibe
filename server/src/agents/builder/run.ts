import { type BaseMessage, createAgent } from "langchain";

import { env } from "../../config/env.js";
import { getChatModel } from "../../lib/model.js";

import type { BuilderInput, BuilderResult } from "../types.js";
import { createBuilderTools } from "./tools.js";
import { BUILDER_PROMPT } from "./prompt.js";
import { FileCollection } from "../../lib/sandbox.js";
import {
  isRecursionLimitExceeded,
  lastAssistantText,
  streamAgentValues,
} from "../shared/langchain.js";
import { appendAgentMessage } from "../shared/handoff.js";

export async function runBuilder(input: BuilderInput): Promise<BuilderResult> {
  const files: FileCollection = { ...input.files };

  const { terminalTool, readFilesTool, createOrUpdateFilesTool } =
    createBuilderTools(input.sandboxId, input.files, () =>
      input.onProgress?.(),
    );

  // Create the builder agent
  const agent = createAgent({
    name: "builder",
    model: getChatModel(env.GEMINI_BUILDER_MODEL),
    tools: [terminalTool, readFilesTool, createOrUpdateFilesTool],
    systemPrompt: BUILDER_PROMPT,
    version: "v1",
    signal: input.signal,
  });

  const fileListing = Object.keys(files).join(", ") || "[No files]";

  const contextTillNow = `
  Task:\n${input.task}\n\n
  Existing Files:\n${fileListing}\n\n
  Design:\n${input.design}\n\n 
  `;

  const agentInput = {
    messages: [
      {
        role: "user",
        content: contextTillNow,
      },
    ],
  };

  let finalMessages: BaseMessage[] = [];

  try {
    const stream = await agent.stream(agentInput, {
      streamMode: "values",
      recursionLimit: 16,
    });

    const result = await streamAgentValues(stream, {
      onProgress: input.onProgress,
    });

    finalMessages = result.messages;
  } catch (error) {
    if (!isRecursionLimitExceeded(error)) {
      throw error;
    }
    input.onProgress?.();
  }

  const notes =
    lastAssistantText(finalMessages) ||
    "[Hardcoded] Builder created the files for the project";

  await input.onTodos?.([], {
    agent: "builder",
    detail: notes,
  });

  const thread = appendAgentMessage(input.thread, "builder", notes);

  return { thread, files, notes };
}
