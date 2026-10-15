import express from "express";
import { env } from "./config/env";

const app = express();

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.listen(env.API_PORT, () => {
  console.log(`Server is running on port ${env.API_PORT}`);
});
