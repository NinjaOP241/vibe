import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  BaseMessage,
} from "@langchain/core/messages";

import type { AgentChatMessage } from "../types.js";

/**
 * Callbacks used while consuming an agent's values stream.
 */
export interface StreamAgentValuesOptions {
  // Called for each chunk received from the stream.
  onProgress?: () => void;

  // Called when the stream provides a non-empty message snapshot.
  onMessages?: (messages: readonly BaseMessage[]) => Promise<void> | void;
}

/**
 * The latest usable state collected from an agent's values stream.
 */
export interface StreamAgentValuesResult {
  messages: BaseMessage[];
  todos: unknown[];
}

interface AgentStateSnapshot {
  messages: BaseMessage[];
  todos: unknown[];
}

/**
 * Converts the application's stored conversation messages into LangChain
 * message instances, preserving each message's role.
 */
export function toLangChainMessages(
  messages: readonly AgentChatMessage[],
): BaseMessage[] {
  return messages.map((message) => {
    switch (message.role) {
      case "user":
        return new HumanMessage(message.content);

      case "assistant":
        return new AIMessage(message.content);

      case "system":
        return new SystemMessage(message.content);
    }
  });
}

/**
 * Checks whether an unknown value is a non-null, non-array object that can
 * safely be read as a record.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readAgentStateFromChunk(chunk: unknown): AgentStateSnapshot {
  if (!isRecord(chunk)) {
    return { todos: [], messages: [] };
  }

  const messages = Array.isArray(chunk.messages)
    ? chunk.messages.filter((message): message is BaseMessage =>
        BaseMessage.isInstance(message),
      )
    : [];

  const todos = Array.isArray(chunk.todos) ? chunk.todos : [];

  return { todos, messages };
}

export async function streamAgentValues(
  stream: AsyncIterable<unknown>,
  options: StreamAgentValuesOptions = {},
): Promise<StreamAgentValuesResult> {
  let latestMessages: BaseMessage[] = [];
  let latestTodos: unknown[] = [];

  for await (const chunk of stream) {
    console.debug("[streamAgentValues] Received chunk:", chunk);

    options.onProgress?.();

    const { messages, todos } = readAgentStateFromChunk(chunk);

    if (messages.length > 0) {
      latestMessages = messages;
      await options.onMessages?.(latestMessages);
    }

    if (todos.length > 0) {
      latestTodos = todos;
    }
  }

  return { messages: latestMessages, todos: latestTodos };
}

/**
 * Extracts readable text from a LangChain message content value.
 *
 * Plain text is returned directly. For multimodal content arrays, text fields
 * are joined while non-text blocks are ignored.
 */
export function messageText(content: unknown): string {
  if (typeof content === "string") {
    return content.trim();
  }

  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((part): string => {
      if (typeof part === "string") {
        return part;
      }

      if (isRecord(part) && typeof part.text === "string") {
        return part.text;
      }

      return "";
    })
    .join("\n")
    .trim();
}

/**
 * Returns the readable text from the most recent AI message, or an empty
 * string when there is no AI message with readable text.
 */
export function lastAssistantText(messages: readonly BaseMessage[]): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];

    if (!AIMessage.isInstance(message)) {
      continue;
    }

    const text = messageText(message.content);

    if (text) {
      return text;
    }
  }

  return "";
}

export function isRecursionLimitExceeded(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const record = error as {
    message?: unknown;
    lc_error_code?: unknown;
    name?: unknown;
  };

  return (
    (typeof record.message === "string" &&
      record.message.includes("Recursion limit exceeded")) ||
    record.lc_error_code === "GRAPH_RECURSION_LIMIT" ||
    record.name === "GraphRecursionError"
  );
}
