import { proxyActivities } from "@temporalio/workflow";
import type * as activities from "../activities/index.js";

import {
  emptyPipelineState,
  type CodeAgentInput,
  type WorkflowPipelineState,
} from "./workflow-types.js";
import { updateTodoStatusForPhase } from "../../lib/plan.js";
import type { AgentChatMessage } from "../../agents/types.js";

const {
  createSandbox,
  loadRecentMessagesForAgent,
  saveAssistantResult,
  generateTitle,
  generateResponse,
  savePlanActivity,
  runPlannerActivity,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: "10 minutes",
  retry: {
    maximumAttempts: 3,
  },
});

export async function pingWorkflow(name: string): Promise<string> {
  return `Hello, ${name}! The ping workflow has been successfully executed.`;
}

export async function codeAgentWorkflow(input: CodeAgentInput) {
  // Create a sandbox for the project
  const sandboxId = await createSandbox({
    projectId: input.projectId,
    userId: input.userId,
  });

  const previousMessages = await loadRecentMessagesForAgent({
    projectId: input.projectId,
    limit: 5,
  });

  const thread: AgentChatMessage[] = [{ role: "user", content: input.prompt }];

  let state: WorkflowPipelineState = emptyPipelineState(thread);

  // Run the planner activity to generate todos and update the workflow state
  state = await runPlannerActivity({
    projectId: input.projectId,
    sandboxId,
    prompt: input.prompt,
    state,
  });

  // Update the status of todos in the "design" phase to "in_progress" before calling the design agent
  state.todos = updateTodoStatusForPhase(state.todos, "design", "start");

  // Sync the updated plan with the database, including the activity that led to this handoff
  // Remember the ID of the saved plan message in the workflow state so future calls update the same message.
  state.planMessageId = await savePlanActivity({
    projectId: input.projectId,
    messageId: state.planMessageId || null,
    todos: state.todos,
    activity: {
      agent: "design",
      detail: "Handoff to designer",
    },
  });

  // TODO: Implement the design agent activity and update the workflow state accordingly.
  /**
   *
   * state = await runDesignerActivity({
   *   projectId: input.projectId,
   *   sandboxId,
   *   prompt: input.prompt,
   *   state,
   * });
   *
   * state.todos = updateTodoStatusForPhase(
   *   state.todos,
   *   "design",
   *   "complete",
   * );
   *
   * state.planMessageId = await savePlanActivity({
   *   projectId: input.projectId,
   *   messageId: state.planMessageId ?? null,
   *   todos: state.todos,
   *   activity: {
   *     agent: "designer",
   *     detail: "Handoff to builder",
   *   },
   * });
   */

  /**
   * DUMMY IMPLEMENTATION FOR NOW:
   */
  // Generate a title and response based on the prompt
  const SAMPLE_SUMMARY =
    "A custom todo app built with React and TypeScript, featuring a simple UI for managing tasks."; // DUMMY SUMMARY
  const title = await generateTitle(SAMPLE_SUMMARY);
  const response = await generateResponse(SAMPLE_SUMMARY);

  // Save the dummy app result to the database
  await saveAssistantResult({
    isError: false,
    projectId: input.projectId,
    userId: input.userId,
    content: response,
    title,
    sandboxUrl: "https://example.com",
    files: {
      "src/App.tsx": `export default function App() {
        return <div>Hello, World!</div>;
      }`,
    },
  });

  return {
    files: null,
  };
}
