import type { Request, Response } from "express";

import type { IProjectService } from "../services/project.service.interface.js";
import { badRequest, notFound } from "../utils/api-error.js";
import { sendSuccess } from "../utils/api-response.js";

export class ProjectController {
  constructor(private readonly projectService: IProjectService) {}

  async getProjects(req: Request, res: Response): Promise<void> {
    const userId = req.auth!.userId;

    const projects = await this.projectService.getProjects(userId);
    sendSuccess(res, projects);
  }

  async getProjectById(req: Request, res: Response): Promise<void> {
    const userId = req.auth!.userId;

    const projectId = req.params.projectId as string;

    if (!projectId) {
      throw badRequest("Project ID is required");
    }

    const project = await this.projectService.getProjectById(projectId, userId);

    if (!project) {
      throw notFound("Project not found");
    }

    sendSuccess(res, project);
  }

  async createProject(req: Request, res: Response): Promise<void> {
    const userId = req.auth!.userId;
    const data = req.body;

    const project = await this.projectService.createProject({
      userId,
      messageContent: data.messageContent,
    });

    sendSuccess(res, project, 201, "Project created successfully");
  }
}
