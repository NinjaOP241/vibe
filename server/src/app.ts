import cors from "cors";
import express from "express";
import type { Express } from "express";
import { apiRouter } from "./routes/api.route.js";
import { routeNotFound } from "./middlewares/route-not-found.js";
import { errorHandler } from "./middlewares/error-handler.js";

export const createApp = (): Express => {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use("/api", apiRouter);

  app.use(routeNotFound);
  app.use(errorHandler);

  return app;
};
