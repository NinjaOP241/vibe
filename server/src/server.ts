import { createApp } from "./app.js";
import { env } from "./config/env.js";

const app = createApp();

export async function startServer() {
  app.listen(env.API_PORT, () => {
    console.log(`[server]: Running on port ${env.API_PORT}`);
  });
}

startServer().catch((err) => {
  // app.listen can throw an error if the port is already in use
  console.error("[server]: Failed to start", err);
  process.exit(1); // Exit the process with an error code
});
