import type { PlannerInput, PlannerResult } from "../types.js";

export async function runPlanner(input: PlannerInput): Promise<PlannerResult> {
  return {
    notes: "",
    todos: [],
    thread: input.thread,
  };
}
