import { ApplicationFailure } from "@temporalio/common";

import {
  ensureSandbox,
  type FileCollection,
  readSandboxTree,
} from "../../lib/sandbox.js";

import { messageService, projectService } from "../../container.js";

import type { SaveAssistantResultInput } from "../../services/message.service.interface.js";
import { runPlainPrompt } from "../../lib/llm.js";
import { FRAGMENT_TITLE_PROMPT, RESPONSE_PROMPT } from "../../lib/prompt.js";

/**
 * createSandbox is an activity that creates a sandbox for a given project ID,
 * and returns the sandboxId
 */
export async function createSandbox(input: {
  projectId: string;
  userId: string;
}): Promise<string> {
  const project = await projectService.getProjectById(
    input.projectId,
    input.userId,
  );

  if (!project) {
    throw ApplicationFailure.nonRetryable("Project not found or access denied");
  }

  // DUMMY implementation for now, just ensure the sandbox exists
  await ensureSandbox(input.projectId);
  return input.projectId; // Return a dummy sandboxId
}

export async function saveAssistantResult(input: SaveAssistantResultInput) {
  const result = await messageService.saveAssistantResult(input);

  if (!result) {
    throw ApplicationFailure.nonRetryable("Project not found or access denied");
  }

  return result;
}

export async function loadSandboxFiles(
  sandboxId: string,
): Promise<FileCollection> {
  return readSandboxTree(sandboxId);
}

export async function generateTitle(summary: string): Promise<string> {
  const title = await runPlainPrompt(FRAGMENT_TITLE_PROMPT, summary);
  return title;
}

export async function generateResponse(summary: string): Promise<string> {
  const response = await runPlainPrompt(RESPONSE_PROMPT, summary);
  return response;
}

export { runPlannerActivity } from "./agent.activities.js";
export { savePlanActivity } from "./plan.activities.js";
