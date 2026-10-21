import { Router } from "express";

import type { ProjectController } from "../controllers/project.controller.js";
import { requireAuthenticatedUser } from "../middlewares/require-authenticated-user.js";
import { createProjectBodySchema } from "../dtos/project.dto.js";
import { validate } from "../middlewares/validate.js";

export function createProjectRouter(
  projectController: ProjectController,
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

  return router;
}
