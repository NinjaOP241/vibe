import type { AgentChatMessage } from "../types.js";

/**
 * Adds an agent's response to the existing conversation thread.
 *
 * Why:
 * When an agent produces a response, we may want to pass that response
 * into the next agent's conversation context. The agent label helps
 * identify who produced the message.
 *
 * Input:
 * - thread: Existing conversation messages.
 * - agentLabel: Name of the agent, e.g. "Planner" or "Designer".
 * - body: The response produced by that agent.
 *
 * Output:
 * - A new conversation array containing all existing messages plus
 *   one assistant message prefixed with the agent's label.
 * - The original thread remains unchanged.
 *
 * Example:
 * Input:
 *   thread = [{ role: "user", content: "Build a todo app" }]
 *   agentLabel = "Planner"
 *   body = "Create the plan"
 *
 * Output:
 *   [
 *     { role: "user", content: "Build a todo app" },
 *     { role: "assistant", content: "[Planner]\nCreate the plan" }
 *   ]
 */
export function appendAgentMessage(
  thread: AgentChatMessage[],
  agentLabel: string,
  body: string,
): AgentChatMessage[] {
  const content = `[${agentLabel}]\n${body.trim()}`;

  return [
    ...thread,
    {
      role: "assistant",
      content,
    },
  ];
}
