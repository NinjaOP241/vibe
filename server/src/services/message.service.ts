import { MessageRole, MessageType } from "../../generated/prisma/client.js";

import type { IMessageRepository } from "../repositories/message.repository.interface.js";
import type { IProjectService } from "./project.service.interface.js";
import type {
  CreateMessageInput,
  IMessageService,
  SaveAssistantResultInput,
} from "./message.service.interface.js";

import type { MessageWithFragments } from "../repositories/message.repository.interface.js";

export class MessageService implements IMessageService {
  constructor(
    private readonly messageRepository: IMessageRepository,
    private readonly projectService: IProjectService,
  ) {}

  async getMessagesByProjectId(
    projectId: string,
    userId: string,
  ): Promise<MessageWithFragments[] | null> {
    const project = await this.projectService.getProjectById(projectId, userId);

    if (!project) {
      return null;
    }

    return await this.messageRepository.findByProjectId(projectId);
  }

  async createMessage(
    input: CreateMessageInput,
  ): Promise<MessageWithFragments | null> {
    const project = await this.projectService.getProjectById(
      input.projectId,
      input.userId,
    );

    if (!project) {
      return null;
    }

    return this.messageRepository.create({
      projectId: input.projectId,
      content: input.content,
      role: MessageRole.USER,
      type: MessageType.RESULT,
    });
  }

  async saveAssistantResult(
    input: SaveAssistantResultInput,
  ): Promise<MessageWithFragments | null> {
    const project = await this.projectService.getProjectById(
      input.projectId,
      input.userId,
    );

    if (!project) {
      return null;
    }

    if (input.isError) {
      return this.messageRepository.saveAssistantResult({
        isError: true,
        projectId: input.projectId,
        content: input.content,
      });
    }

    return this.messageRepository.saveAssistantResult({
      isError: false,
      projectId: input.projectId,
      content: input.content,
      title: input.title,
      sandboxUrl: input.sandboxUrl,
      files: input.files,
    });
  }
}
