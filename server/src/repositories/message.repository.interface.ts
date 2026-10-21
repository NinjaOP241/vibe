import type {
  MessageRole,
  MessageType,
  Prisma,
} from "../../generated/prisma/client.js";

export type MessageWithFragments = Prisma.MessageGetPayload<{
  include: {
    fragments: true;
  };
}>;

export interface CreateMessageRecordInput {
  projectId: string;
  content: string;
  role: MessageRole;
  type: MessageType;
}

export interface IMessageRepository {
  findByProjectId(projectId: string): Promise<MessageWithFragments[]>;

  create(input: CreateMessageRecordInput): Promise<MessageWithFragments>;
}
