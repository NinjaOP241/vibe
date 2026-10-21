import type { Project } from "../../generated/prisma/client.js";

import type { ProjectWithMessages } from "../repositories/project.repository.interface.js";

export interface CreateProjectInput {
  userId: string;
  messageContent: string;
}

export interface IProjectService {
  getProjects(userId: string): Promise<Project[]>;

  getProjectById(projectId: string, userId: string): Promise<Project | null>;

  createProject(input: CreateProjectInput): Promise<ProjectWithMessages>;
}
