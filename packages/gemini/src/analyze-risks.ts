import type { InteractionGateway, SourceInput } from "./client.js";
import { RISKS_PROMPT } from "./prompts/risks.js";
import { risksJsonSchema, risksResultSchema } from "./schemas/analysis.js";

export function analyzeRisks(client: InteractionGateway, source: SourceInput) {
  return client.analyze(RISKS_PROMPT, source, risksJsonSchema, risksResultSchema);
}
