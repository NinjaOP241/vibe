import { env } from "../config/env.js";
import { getTemporalClient, isTemporalHealthy } from "../config/temporal.js";
import type { CodeAgentInput } from "./workflows/workflow-types.js";

async function startWorkflow(
  workflowName: string,
  workflowId: string,
  args: unknown[],
  taskQueue: string,
) {
  // Check if Temporal is healthy before attempting to start the workflow
  if (!(await isTemporalHealthy())) {
    console.warn("[temporal] Temporal is unhealthy; skipping workflow start.");
    return null;
  }

  try {
    /**
     * Suppose at the time of health check, temporal was healthy.
     * And before we could get the client the temporal server went down.
     * In that case, we want to avoid waiting indefinitely for the client to connect.
     *
     * We will use Promise.race to set a timeout for the client connection.
     * If the connection takes longer than 5 seconds, we will reject the promise and log an error.
     */
    const client = await Promise.race([
      getTemporalClient(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Temporal client connection timeout")),
          5000,
        ),
      ),
    ]);

    // Start the workflow with the provided name, ID, and arguments
    const handle = await client.workflow.start(workflowName, {
      taskQueue,
      workflowId,
      args,
    });

    return handle.workflowId;
  } catch (err) {
    console.error(
      `[temporal] Error starting workflow ${workflowName} with id ${workflowId}, error: ${err}`,
    );
    return null;
  }
}

export async function startPingWorkflow(name: string) {
  return startWorkflow(
    "pingWorkflow",
    `ping-${Date.now()}`,
    [name],
    env.TEMPORAL_TASK_QUEUE,
  );
}

export async function startCodeAgentWorkflow(input: CodeAgentInput) {
  return startWorkflow(
    "codeAgentWorkflow",
    `code-agent-${Date.now()}`,
    [input],
    env.TEMPORAL_TASK_QUEUE,
  );
}
