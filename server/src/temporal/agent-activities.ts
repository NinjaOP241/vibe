import { cancellationSignal, heartbeat } from "@temporalio/activity";
import type { AgentBasePayload, WorkflowPipelineState } from "./workflow-types";
import { runPlanner } from "../agents/planner/run";
import { PlanActivity, TodoItem } from "../lib/plan";
import { messageService } from "../container.js";

const HEARTBEAT_INTERVAL_MS = 5_000;

type Beat = () => void;

export async function withHeartbeat<T>(
  run: (beat: Beat) => Promise<T>,
): Promise<T> {
  const beat: Beat = () => {
    try {
      heartbeat();
    } catch (error) {
      console.warn("Activity heartbeat failed:", error);
    }
  };

  const ticker = setInterval(beat, HEARTBEAT_INTERVAL_MS);

  try {
    return await run(beat);
  } finally {
    clearInterval(ticker);
  }
}

async function syncPlan(
  projectId: string,
  state: WorkflowPipelineState,
  todos: TodoItem[],
  activity?: PlanActivity | null,
): Promise<void> {
  const saved = await messageService.savePlanMessage({
    projectId,
    messageId: state.planMessageId || null,
    todos,
    activity: activity || null,
  });

  // Remember the ID of the saved plan message in the workflow state so future calls update the same message.
  state.planMessageId = saved.id;
}

export async function runPlannerActivity(
  input: AgentBasePayload,
): Promise<WorkflowPipelineState> {
  return withHeartbeat(async (beat) => {
    const started = Date.now();
    const state = { ...input.state };

    const result = await runPlanner({
      // The actual planner agent logic
      prompt: input.prompt,
      thread: state.thread,
      todos: state.todos,
      signal: cancellationSignal(),
      onProgress: beat,
      onTodos: async (todos) => {
        // Update the workflow state with the latest todos and sync the plan message in the database.
        state.todos = todos;
        await syncPlan(input.projectId, state, todos);

        beat();
      },
    });

    state.thread = result.thread;

    // Once the planner has completed, sync the final plan message with the database, including the activity that led to this handoff.
    await syncPlan(input.projectId, state, state.todos, {
      agent: "designer",
      detail: "Handoff to designer",
    });

    return state;
  });
}
