import { generateSlug } from "random-word-slugs";
import type { Project } from "../../generated/prisma/client.js";

import type {
  IProjectRepository,
  ProjectWithMessages,
} from "../repositories/project.repository.interface.js";

import type {
  CreateProjectInput,
  IProjectService,
} from "./project.service.interface.js";

export class ProjectService implements IProjectService {
  constructor(private readonly projectRepository: IProjectRepository) {}

  async getProjects(userId: string): Promise<Project[]> {
    return this.projectRepository.findAll(userId);
  }

  async getProjectById(
    projectId: string,
    userId: string,
  ): Promise<Project | null> {
    return this.projectRepository.findById(projectId, userId);
  }

  async createProject(input: CreateProjectInput): Promise<ProjectWithMessages> {
    const name = generateSlug(3, { format: "kebab" });

    const project = this.projectRepository.createWithInitialMessage({
      name,
      userId: input.userId,
      messageContent: input.messageContent,
    });
    return project;
  }
}
