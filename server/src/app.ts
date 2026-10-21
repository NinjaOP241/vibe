import cors from "cors";
import express from "express";
import type { Express } from "express";
import { apiRouter } from "./routes/api.route";

export const createApp = (): Express => {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use("/api", apiRouter);

  return app;
};
