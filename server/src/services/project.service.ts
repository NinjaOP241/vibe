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
import { startCodeAgentWorkflow } from "../temporal/client.js";

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
    // Generate a random slug for the project name
    const name = generateSlug(3, { format: "kebab" });

    // Create the project with the initial message in the database
    const project = await this.projectRepository.createWithInitialMessage({
      name,
      userId: input.userId,
      messageContent: input.messageContent,
    });

    // Start the code agent workflow
    await startCodeAgentWorkflow({
      projectId: project.id,
      userId: input.userId,
      prompt: input.messageContent,
    });

    return project;
  }
}
