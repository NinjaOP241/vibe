import { cancellationSignal, heartbeat } from "@temporalio/activity";
import type {
  AgentBasePayload,
  WorkflowPipelineState,
} from "../workflows/workflow-types.js";
import { runPlanner } from "../../agents/planner/run";
import { persistPlanMessage } from "./plan.activities.js";

const HEARTBEAT_INTERVAL_MS = 5_000;

type Beat = () => void;

async function withHeartbeat<T>(run: (beat: Beat) => Promise<T>): Promise<T> {
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

export async function runPlannerActivity(
  input: AgentBasePayload,
): Promise<WorkflowPipelineState> {
  return withHeartbeat(async (beat) => {
    const state = { ...input.state };

    const result = await runPlanner({
      // The actual planner agent logic
      prompt: input.prompt,
      thread: state.thread,
      todos: state.todos,
      signal: cancellationSignal(),
      onProgress: beat,
      onTodos: async (todos, activity) => {
        // Update the workflow state with the latest todos and sync the plan message in the database.
        state.todos = todos;
        state.planMessageId = await persistPlanMessage({
          projectId: input.projectId,
          messageId: state.planMessageId,
          todos,
          activity,
        });
        beat();
      },
    });

    state.thread = result.thread;
    state.todos = result.todos;

    return state;
  });
}
