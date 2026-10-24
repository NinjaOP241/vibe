import { NativeConnection, Worker } from "@temporalio/worker";

import { env } from "../config/env.js";
import * as activities from "./activities/index.js";
import { backOff } from "exponential-backoff";

async function main() {
  /**
   * The workers will run as a separate process.
   * Hence, we need to establish a connection to the Temporal server in this process as well.
   */
  const connection = await backOff(
    () => {
      return NativeConnection.connect({
        address: env.TEMPORAL_ADDRESS,
      });
    },
    {
      numOfAttempts: 5,
      startingDelay: 500,
      timeMultiple: 2,
      maxDelay: 5_000,
      jitter: "full",
      retry: (error, attemptNumber) => {
        console.warn(
          `[Worker] Temporal connection attempt ${attemptNumber} failed; retrying.`,
          error,
        );

        return true;
      },
    },
  );

  // Create a worker that will listen to the specified task queue and execute workflows and activities
  const worker = await Worker.create({
    connection,
    namespace: env.TEMPORAL_NAMESPACE,
    taskQueue: env.TEMPORAL_TASK_QUEUE,
    workflowsPath: require.resolve("./workflows/index.js"),
    activities,
  });

  console.log(`Temporal worker listening on: ${env.TEMPORAL_TASK_QUEUE}`);
  await worker.run(); // Start the worker to listen for tasks
}

main().catch((err) => {
  console.error("Temporal worker failed to start", err);
  process.exit(1); // Exit the process with an error code if the worker fails to start
});
