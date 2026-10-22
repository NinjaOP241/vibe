import { ApplicationFailure } from "@temporalio/common";

import { ensureSandbox } from "../lib/sandbox.js";

import { messageService, projectService } from "../container.js";

import type { SaveAssistantResultInput } from "../services/message.service.interface.js";

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
