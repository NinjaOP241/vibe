import { Router } from "express";

import { projectController, messageController } from "../container.js";
import { createProjectRouter } from "./project.route.js";

export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

apiRouter.use(
  "/projects",
  createProjectRouter(projectController, messageController),
);
