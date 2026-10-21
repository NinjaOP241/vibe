import type { PrismaClient } from "../../generated/prisma/client.js";
import type {
  CreateMessageRecordInput,
  IMessageRepository,
  MessageWithFragments,
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
}
