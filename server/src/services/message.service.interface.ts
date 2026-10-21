import type { MessageWithFragments } from "../repositories/message.repository.interface.js";

export interface CreateMessageInput {
  projectId: string;
  userId: string;
  content: string;
}

export interface IMessageService {
  getMessagesByProjectId(
    projectId: string,
    userId: string,
  ): Promise<MessageWithFragments[] | null>;

  createMessage(
    input: CreateMessageInput,
  ): Promise<MessageWithFragments | null>;
}
