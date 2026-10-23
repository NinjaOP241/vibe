import type { AgentChatMessage } from "../agents/types.js";
import { PlanActivity, TodoItem } from "../lib/plan.js";
import type { FileCollection } from "../lib/sandbox.js";
import type { MessageWithFragments } from "../repositories/message.repository.interface.js";

export interface CreateMessageInput {
  projectId: string;
  userId: string;
  content: string;
}

export type SaveAssistantResultInput =
  | {
      isError: true;
      projectId: string;
      userId: string;
      content: string;
    }
  | {
      isError: false;
      projectId: string;
      userId: string;
      content: string;
      title: string;
      sandboxUrl: string;
      files: FileCollection;
    };

export interface SavePlanMessageInput {
  projectId: string;
  messageId: string | null;
  todos: TodoItem[];
  activity: PlanActivity | null;
}

export interface IMessageService {
  loadRecentMessagesForAgent(
    projectId: string,
    limit: number,
  ): Promise<AgentChatMessage[]>;

  getMessagesByProjectId(
    projectId: string,
    userId: string,
  ): Promise<MessageWithFragments[] | null>;

  createMessage(
    input: CreateMessageInput,
  ): Promise<MessageWithFragments | null>;

  saveAssistantResult(
    input: SaveAssistantResultInput,
  ): Promise<MessageWithFragments | null>;

  savePlanMessage(input: SavePlanMessageInput): Promise<MessageWithFragments>;
}
