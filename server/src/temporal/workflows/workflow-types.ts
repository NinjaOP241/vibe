import { TodoItem } from "../../lib/plan.js";

export interface WorkflowAgentMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

// This message will be passed between activities (actual agents) of the workflow
export interface WorkflowPipelineState {
  todos: TodoItem[];
  thread: WorkflowAgentMessage[];
  files: Record<string, string>;
  design: string;
  buildNotes: string;
  review: string;
  summary: string;
  planMessageId?: string;
}

export interface AgentBasePayload {
  projectId: string;
  sandboxId: string;
  prompt: string;
  state: WorkflowPipelineState;
}

export interface CodeAgentInput {
  projectId: string;
  userId: string;
  prompt: string;
}

export function emptyPipelineState(
  thread: WorkflowAgentMessage[],
): WorkflowPipelineState {
  return {
    todos: [],
    thread,
    files: {},
    design: "",
    buildNotes: "",
    review: "",
    summary: "",
  };
}

export function createAgentBasePayload(
  input: CodeAgentInput,
  state: WorkflowPipelineState,
): AgentBasePayload {
  return {
    projectId: input.projectId,
    sandboxId: input.projectId,
    prompt: input.prompt,
    state,
  };
}
