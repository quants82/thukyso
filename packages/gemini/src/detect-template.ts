import type { InteractionGateway, SourceInput } from "./client.js";
import { ATTACHMENTS_PROMPT } from "./prompts/attachments.js";
import {
  attachmentsJsonSchema,
  attachmentsResultSchema
} from "./schemas/analysis.js";

export function detectTemplate(client: InteractionGateway, source: SourceInput) {
  return client.analyze(
    ATTACHMENTS_PROMPT,
    source,
    attachmentsJsonSchema,
    attachmentsResultSchema
  );
}
