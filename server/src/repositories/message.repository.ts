import type { Message, PrismaClient } from "../../generated/prisma/client.js";
import { MessageRole, MessageType } from "../../generated/prisma/enums.js";
import type {
  CreateMessageRecordInput,
  IMessageRepository,
  MessageWithFragments,
  SaveAssistantResultRecord,
  UpdateMessageContentInput,
} from "./message.repository.interface.js";

export class MessageRepository implements IMessageRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  async findByProjectId(projectId: string): Promise<MessageWithFragments[]> {
    return this.prismaClient.message.findMany({
      where: {
        projectId,
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      include: {
        fragments: true,
      },
    });
  }

  async create(input: CreateMessageRecordInput): Promise<MessageWithFragments> {
    return this.prismaClient.message.create({
      data: {
        projectId: input.projectId,
        content: input.content,
        role: input.role,
        type: input.type,
      },
      include: {
        fragments: true,
      },
    });
  }

  async saveAssistantResult(
    input: SaveAssistantResultRecord,
  ): Promise<MessageWithFragments | null> {
    if (input.isError) {
      return this.prismaClient.message.create({
        data: {
          projectId: input.projectId,
          content: input.content,
          role: MessageRole.ASSISTANT,
          type: MessageType.ERROR,
        },
        include: {
          fragments: true,
        },
      });
    }

    return this.prismaClient.message.create({
      data: {
        projectId: input.projectId,
        content: input.content,
        role: MessageRole.ASSISTANT,
        type: MessageType.RESULT,
        fragments: {
          create: {
            title: input.title,
            sandboxUrl: input.sandboxUrl,
            files: input.files,
          },
        },
      },
      include: {
        fragments: true,
      },
    });
  }

  /**
   * Fetches the most recent messages for a project.
   * The database returns them newest first.
   */
  async findRecentByProjectId(
    projectId: string,
    limit: number,
  ): Promise<Message[]> {
    return this.prismaClient.message.findMany({
      where: {
        projectId,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  async updateMessageContent(
    input: UpdateMessageContentInput,
  ): Promise<MessageWithFragments> {
    return this.prismaClient.message.update({
      where: {
        id: input.messageId,
        projectId: input.projectId,
      },
      data: {
        content: input.content,
      },
      include: {
        fragments: true,
      },
    });
  }
}
