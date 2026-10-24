import { PlanActivity, TodoItem } from "../lib/plan.js";

export interface AgentChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AgentRunHooks {
  onProgress?: () => void;
  onTodos?: (
    todos: TodoItem[],
    activity?: PlanActivity | null,
  ) => Promise<void>;
  signal?: AbortSignal;
}

export interface PlannerInput extends AgentRunHooks {
  prompt: string;
  todos: TodoItem[];
  thread: AgentChatMessage[];
}

export interface PlannerResult {
  notes: string;
  todos: TodoItem[];
  thread: AgentChatMessage[];
}

export interface DesignerInput extends AgentRunHooks {
  prompt: string;
  thread: AgentChatMessage[];
}

export interface DesignerResult {
  design: string;
  thread: AgentChatMessage[];
}
