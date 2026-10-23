import { MessageRole, MessageType } from "../../generated/prisma/client.js";

import type { IMessageRepository } from "../repositories/message.repository.interface.js";
import type { IProjectService } from "./project.service.interface.js";
import type {
  CreateMessageInput,
  IMessageService,
  SaveAssistantResultInput,
} from "./message.service.interface.js";

import type { MessageWithFragments } from "../repositories/message.repository.interface.js";
import { AgentChatMessage } from "../agents/types.js";
import { formatPlanForAgent, parsePlanMessage } from "../lib/plan.js";

export class MessageService implements IMessageService {
  constructor(
    private readonly messageRepository: IMessageRepository,
    private readonly projectService: IProjectService,
  ) {}

  /**
   * Loads recent conversation history and converts it into the
   * message format expected by our AI agents.
   */
  async loadRecentMessagesForAgent(
    projectId: string,
    limit: number = 5,
  ): Promise<AgentChatMessage[]> {
    const messages = await this.messageRepository.findRecentByProjectId(
      projectId,
      limit,
    );

    // The query returned newest first. Restore conversation order.
    return messages.reverse().map((message) => ({
      role: message.role === MessageRole.USER ? "user" : "assistant",

      // Convert stored plan JSON into readable plan context.
      // Leave ordinary chat content unchanged.
      content: this.formatMessageContentForAgent(message.content),
    }));
  }

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

  /**
   * The stored message in the database can be of two types:
   * 1. A normal chat message, which is just a string.
   * 2. A plan message, which is a stringified JSON object that contains a list of todos.
   *
   * We need to parse the content and check if it's a plan message.
   * If it is, we format it for the agent. If not, we return the content as is.
   */
  private formatMessageContentForAgent(content: string): string {
    const todos = parsePlanMessage(content);
    return todos ? formatPlanForAgent(todos) : content;
  }
}
