import type { Request, Response } from "express";
import { getAllProjects } from "../services/project.service";
import { sendSuccess } from "../utils/api-response";

export async function listProjects(req: Request, res: Response) {
  const projects = await getAllProjects();
  sendSuccess(res, projects);
}
