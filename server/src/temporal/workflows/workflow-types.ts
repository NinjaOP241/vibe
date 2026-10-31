import type { AgentChatMessage } from "../../agents/types.js";
import { TodoItem } from "../../lib/plan.js";

// This message will be passed between activities (actual agents) of the workflow
export interface WorkflowPipelineState {
  todos: TodoItem[];
  thread: AgentChatMessage[];
  files: Record<string, string>;
  design: string;
  builderNotes: string;
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
  thread: AgentChatMessage[],
): WorkflowPipelineState {
  return {
    todos: [],
    thread,
    files: {},
    design: "",
    builderNotes: "",
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
