import { FileCollection } from "../lib/sandbox.js";
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

export interface IMessageService {
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
}
