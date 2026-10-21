import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { connectDatabase } from "./lib/prisma.js";

const app = createApp();

async function startServer() {
  await connectDatabase();
  app.listen(env.API_PORT, () => {
    console.log(`Server is running on port ${env.API_PORT}`);
  });
}

startServer().catch((error) => {
  // app.listen can throw an error if the port is already in use
  console.error("[server]: Failed to start", error);
  process.exit(1); // Exit the process with an error code
});
