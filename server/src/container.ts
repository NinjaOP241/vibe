import { prisma } from "./lib/prisma.js";
import { ProjectRepository } from "./repositories/project.repository.js";
import { ProjectService } from "./services/project.service.js";
import { ProjectController } from "./controllers/project.controller.js";

const projectRepository = new ProjectRepository(prisma);
const projectService = new ProjectService(projectRepository);
export const projectController = new ProjectController(projectService);
