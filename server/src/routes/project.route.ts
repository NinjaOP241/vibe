import { Router } from "express";

import type { ProjectController } from "../controllers/project.controller.js";
import type { MessageController } from "../controllers/message.controller.js";
import { requireAuthenticatedUser } from "../middlewares/require-authenticated-user.js";
import { createProjectBodySchema } from "../dtos/project.dto.js";
import { validate } from "../middlewares/validate.js";
import { createMessageBodySchema } from "../dtos/message.dto.js";

export function createProjectRouter(
  projectController: ProjectController,
  messageController: MessageController,
): Router {
  const router = Router();

  router.use(requireAuthenticatedUser);

  router.get("/", projectController.getProjects.bind(projectController));
  router.get(
    "/:projectId",
    projectController.getProjectById.bind(projectController),
  );
  router.post(
    "/",
    validate(createProjectBodySchema),
    projectController.createProject.bind(projectController),
  );

  router.get(
    "/:projectId/messages",
    messageController.getMessagesByProjectId.bind(messageController),
  );
  router.post(
    "/:projectId/messages",
    validate(createMessageBodySchema),
    messageController.createMessage.bind(messageController),
  );

  return router;
}
