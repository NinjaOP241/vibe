import type {
  MessageRole,
  MessageType,
  Prisma,
} from "../../generated/prisma/client.js";
import type { FileCollection } from "../lib/sandbox.js";

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

/**
 * Input required to persist an assistant result.
 * Successful results include generated files and fragment metadata.
 */
export type SaveAssistantResultRecord =
  | {
      isError: true;
      projectId: string;
      content: string;
    }
  | {
      isError: false;
      projectId: string;
      content: string;
      title: string;
      sandboxUrl: string;
      files: FileCollection;
    };

export interface IMessageRepository {
  findByProjectId(projectId: string): Promise<MessageWithFragments[]>;

  create(input: CreateMessageRecordInput): Promise<MessageWithFragments>;

  saveAssistantResult(
    input: SaveAssistantResultRecord,
  ): Promise<MessageWithFragments | null>;
}
