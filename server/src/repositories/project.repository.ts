import {
  MessageRole,
  MessageType,
  type PrismaClient,
  type Project,
} from "../../generated/prisma/client.js";

import type {
  CreateProjectWithInitialMessageInput,
  IProjectRepository,
  ProjectWithMessages,
} from "./project.repository.interface.js";

export class ProjectRepository implements IProjectRepository {
  constructor(private readonly prismaClient: PrismaClient) {}
  async findAll(userId: string): Promise<Project[]> {
    return this.prismaClient.project.findMany({
      where: {
        userId,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });
  }

  async findById(projectId: string, userId: string): Promise<Project | null> {
    return this.prismaClient.project.findUnique({
      where: {
        id: projectId,
        userId,
      },
    });
  }

  async createWithInitialMessage(
    input: CreateProjectWithInitialMessageInput,
  ): Promise<ProjectWithMessages> {
    return this.prismaClient.project.create({
      data: {
        name: input.name,
        userId: input.userId,
        messages: {
          create: {
            content: input.messageContent,
            role: MessageRole.USER,
            type: MessageType.RESULT,
          },
        },
      },
      include: {
        messages: true,
      },
    });
  }
}
