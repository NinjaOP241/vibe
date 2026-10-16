import type { Project } from "../../generated/prisma/client.js";
import { LOCAL_USER_ID } from "../config/constants.js";
import { prisma } from "../lib/prisma";

export async function findAllProjects(): Promise<Project[]> {
  return prisma.project.findMany({
    where: { userId: LOCAL_USER_ID },
    orderBy: { updatedAt: "desc" },
  });
}
