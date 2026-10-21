import type { Request, Response } from "express";

import type { IMessageService } from "../services/message.service.interface.js";
import { badRequest, notFound } from "../utils/api-error.js";
import { sendSuccess } from "../utils/api-response.js";

export class MessageController {
  constructor(private readonly messageService: IMessageService) {}

  async getMessagesByProjectId(req: Request, res: Response): Promise<void> {
    const userId = req.auth!.userId;
    const projectId = req.params.projectId as string;

    if (!projectId) {
      throw badRequest("Project ID is required");
    }

    const messages = await this.messageService.getMessagesByProjectId(
      projectId,
      userId,
    );

    if (!messages) {
      throw notFound("Project not found");
    }

    sendSuccess(res, messages);
  }

  async createMessage(req: Request, res: Response): Promise<void> {
    const userId = req.auth!.userId;
    const projectId = req.params.projectId as string;
    const { content } = req.body;

    if (!projectId) {
      throw badRequest("Project ID is required");
    }

    const message = await this.messageService.createMessage({
      projectId,
      userId,
      content,
    });

    if (!message) {
      throw notFound("Project not found");
    }

    sendSuccess(res, message);
  }
}
