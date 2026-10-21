import { prisma } from "./lib/prisma.js";

import { ProjectRepository } from "./repositories/project.repository.js";
import { ProjectService } from "./services/project.service.js";
import { ProjectController } from "./controllers/project.controller.js";

import { MessageRepository } from "./repositories/message.repository.js";
import { MessageService } from "./services/message.service.js";
import { MessageController } from "./controllers/message.controller.js";

const projectRepository = new ProjectRepository(prisma);
const projectService = new ProjectService(projectRepository);
export const projectController = new ProjectController(projectService);

const messageRepository = new MessageRepository(prisma);
const messageService = new MessageService(messageRepository, projectService);
export const messageController = new MessageController(messageService);
