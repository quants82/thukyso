import type { InteractionGateway, SourceInput } from "./client.js";
import { TASKS_PROMPT } from "./prompts/tasks.js";
import { tasksJsonSchema, tasksResultSchema } from "./schemas/analysis.js";

export function extractTasks(client: InteractionGateway, source: SourceInput) {
  return client.analyze(TASKS_PROMPT, source, tasksJsonSchema, tasksResultSchema);
}
