import { defaultPlan, type TodoItem } from "../../lib/plan.js";

import { appendAgentMessage } from "../shared/handoff.js";

import type { PlannerInput, PlannerResult } from "../types.js";

export async function runPlanner(input: PlannerInput): Promise<PlannerResult> {
  const todos: TodoItem[] = input.todos.length
    ? input.todos
    : defaultPlan(input.prompt);

  const notes = "Plan created for the project";

  const thread = appendAgentMessage(input.thread, "planner", notes);

  return {
    notes,
    todos,
    thread,
  };
}
