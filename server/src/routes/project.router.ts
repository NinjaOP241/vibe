import { Router } from "express";
import { listProjects } from "../controllers/project.controller";

export const projectRouter = Router();

projectRouter.get("/", listProjects);
