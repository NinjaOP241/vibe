import express from "express";
import cors from "cors";
import { env } from "./config/env";
import { apiRouter } from "./routes/api";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api", apiRouter);

app.listen(env.API_PORT, () => {
  console.log(`Server is running on port ${env.API_PORT}`);
});
