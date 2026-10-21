import type { Request, Response, NextFunction } from "express";
import { unauthorized } from "../utils/api-error.js";

export function requireAuthenticatedUser(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  if (!req.auth || !req.auth.userId) {
    throw unauthorized("User is not authenticated");
  }
  next();
}
