import type { Prisma, Project } from "../../generated/prisma/client.js";

export interface CreateProjectWithInitialMessageInput {
  name: string;
  userId: string;
  messageContent: string;
}

export type ProjectWithMessages = Prisma.ProjectGetPayload<{
  include: {
    messages: true;
  };
}>;

export interface IProjectRepository {
  findAll(userId: string): Promise<Project[]>;

  findById(projectId: string, userId: string): Promise<Project | null>;

  createWithInitialMessage(
    input: CreateProjectWithInitialMessageInput,
  ): Promise<ProjectWithMessages>;
}
