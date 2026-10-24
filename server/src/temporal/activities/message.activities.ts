import { ApplicationFailure } from "@temporalio/common";

import { messageService } from "../../container.js";
import type { AgentChatMessage } from "../../agents/types.js";
import type { SaveAssistantResultInput } from "../../services/message.service.interface.js";

export async function loadRecentMessagesForAgent(input: {
  projectId: string;
  limit?: number;
}): Promise<AgentChatMessage[]> {
  return messageService.loadRecentMessagesForAgent(
    input.projectId,
    input.limit || 5,
  );
}

export async function saveAssistantResult(input: SaveAssistantResultInput) {
  const result = await messageService.saveAssistantResult(input);

  if (!result) {
    throw ApplicationFailure.nonRetryable("Project not found or access denied");
  }

  return result;
}
