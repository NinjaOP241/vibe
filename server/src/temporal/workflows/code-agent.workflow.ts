import { proxyActivities } from "@temporalio/workflow";
import type * as activities from "../activities/index.js";

import {
  createAgentBasePayload,
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
  runDesignerActivity,
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

  // Load the recent messages for the agent to provide context for the workflow
  const previousMessages = await loadRecentMessagesForAgent({
    projectId: input.projectId,
    limit: 5,
  });

  // Build the conversation history and ensure the current prompt
  // appears exactly once at the end.
  const thread: AgentChatMessage[] = [...previousMessages];

  const lastMessage = thread.at(-1);
  const currentPromptAlreadyInThread =
    lastMessage?.role === "user" &&
    lastMessage.content.trim() === input.prompt.trim();

  // If the current prompt is not already in the thread, add it as a new user message.
  if (!currentPromptAlreadyInThread) {
    thread.push({
      role: "user",
      content: input.prompt,
    });
  }

  let state: WorkflowPipelineState = emptyPipelineState(thread);

  // Run the planner activity to generate todos and update the workflow state
  state = await runPlannerActivity(createAgentBasePayload(input, state));

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

  state = await runDesignerActivity({
    projectId: input.projectId,
    sandboxId,
    prompt: input.prompt,
    state,
  });

  state.todos = updateTodoStatusForPhase(state.todos, "design", "complete");

  state.todos = updateTodoStatusForPhase(state.todos, "build", "start");

  state.planMessageId = await savePlanActivity({
    projectId: input.projectId,
    messageId: state.planMessageId ?? null,
    todos: state.todos,
    activity: {
      agent: "designer",
      detail: "Handoff to builder",
    },
  });

  // TODO: Implement the builder agent activity and update the workflow state accordingly.

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
