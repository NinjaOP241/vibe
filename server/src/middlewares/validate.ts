import type { Request, Response, NextFunction } from "express";
import type { ZodType } from "zod";
import { badRequest } from "../utils/api-error.js";

export const validate = (schema: ZodType) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      throw badRequest("Validation failed", result.error.issues);
    }

    req.body = result.data;

    next();
  };
};
