import { PlanActivity, TodoItem } from "../lib/plan.js";
import { FileCollection } from "../lib/sandbox.js";

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
  todos: TodoItem[];
  thread: AgentChatMessage[];
}

export interface DesignerResult {
  design: string;
  thread: AgentChatMessage[];
}

export interface BuilderInput extends AgentRunHooks {
  todos: TodoItem[];
  thread: AgentChatMessage[];
  sandboxId: string;
  files: FileCollection;
  design: string;
  task: string;
}

export interface BuilderResult {
  notes: string;
  thread: AgentChatMessage[];
  files: FileCollection;
}
