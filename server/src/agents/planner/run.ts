import { createAgent, todoListMiddleware } from "langchain";

import { env } from "../../config/env.js";
import { getChatModel } from "../../lib/model.js";
import {
  defaultPlan,
  parsePlannerTodos,
  type TodoItem,
} from "../../lib/plan.js";

import { appendAgentMessage } from "../shared/handoff.js";
import {
  lastAssistantText,
  streamAgentValues,
  toLangChainMessages,
} from "../shared/langchain.js";

import type { PlannerInput, PlannerResult } from "../types.js";
import { PLANNER_PROMPT } from "./prompt.js";

export async function runPlanner(input: PlannerInput): Promise<PlannerResult> {
  // Create the planner agent
  const agent = createAgent({
    name: "planner",
    model: getChatModel(env.GEMINI_PLANNER_MODEL),
    tools: [],
    systemPrompt: PLANNER_PROMPT,
    version: "v1",
    signal: input.signal,
    middleware: [todoListMiddleware()],
  });

  /**
   * Run the agent with the conversation history and stream its execution,
   * allowing us to observe the agent's state as it progresses through the workflow.
   */
  const stream = await agent.stream(
    {
      messages: toLangChainMessages(input.thread),
    },
    {
      streamMode: "values",
      recursionLimit: 12,
    },
  );

  const { messages: finalMessages, todos: rawTodos } = await streamAgentValues(
    stream,
    {
      onProgress: input.onProgress,
    },
  );

  console.log("[runPlanner] Final messages:", finalMessages);
  console.log("[runPlanner] Final todos:", rawTodos);

  const plannerNotes = lastAssistantText(finalMessages);

  console.log("[runPlanner] Planner notes:", plannerNotes);

  // parsePlannerTodos reads the Phase tag from todo.content and creates the
  // TodoItem.phase property required by the Temporal workflow.
  const parsedTodos = parsePlannerTodos(rawTodos);
  const usedDefaultPlan = parsedTodos.length === 0;

  console.log("[runPlanner] Parsed todos:", parsedTodos);

  // Fall back only when the agent completed without producing
  // a usable todo list. API/model errors are allowed to propagate.
  const todos: TodoItem[] = usedDefaultPlan
    ? defaultPlan(input.prompt)
    : parsedTodos;

  const notes = usedDefaultPlan
    ? "The planner returned no usable todos, so a default plan was created."
    : plannerNotes || "Plan created for the requested changes.";

  if (usedDefaultPlan) {
    console.warn("[planner] No valid todos returned; using the default plan.");
  }

  // Persist the plan so the workflow and subsequent agents can use it.
  await input.onTodos?.(todos, {
    agent: "planner",
    detail: usedDefaultPlan
      ? "Created a default plan because the planner returned no valid todos"
      : "Plan created by the planner agent",
  });

  // Add only the planner's readable summary to the agent conversation. Raw
  // middleware tool messages are internal execution details.
  const thread = appendAgentMessage(input.thread, "planner", notes);

  return {
    notes,
    todos,
    thread,
  };
}
