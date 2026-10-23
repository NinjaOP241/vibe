import { messageService } from "../container.js";
import type { PlanActivity, TodoItem } from "../lib/plan.js";

export interface SavePlanActivityInput {
  projectId: string;
  messageId?: string | null;
  todos: TodoItem[];
  activity?: PlanActivity | null;
}

export async function persistPlanMessage(
  input: SavePlanActivityInput,
): Promise<string> {
  const saved = await messageService.savePlanMessage({
    projectId: input.projectId,
    messageId: input.messageId ?? null,
    todos: input.todos,
    activity: input.activity ?? null,
  });

  return saved.id;
}

export async function savePlanActivity(
  input: SavePlanActivityInput,
): Promise<string> {
  return persistPlanMessage(input);
}
