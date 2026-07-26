import type { InteractionGateway, SourceInput } from "./client.js";
import { SUMMARY_PROMPT } from "./prompts/summary.js";
import { summaryJsonSchema, summaryResultSchema } from "./schemas/analysis.js";

export function summarizeDocument(client: InteractionGateway, source: SourceInput) {
  return client.analyze(
    SUMMARY_PROMPT,
    source,
    summaryJsonSchema,
    summaryResultSchema
  );
}
