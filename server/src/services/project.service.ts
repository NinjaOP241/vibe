import type { Project } from "../../generated/prisma/client.js";
import { findAllProjects } from "../repositories/project.repository";

export async function getAllProjects(): Promise<Project[]> {
  return findAllProjects();
}
