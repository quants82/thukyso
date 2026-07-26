import type { InteractionGateway, SourceInput } from "./client.js";
import { METADATA_PROMPT } from "./prompts/metadata.js";
import {
  metadataJsonSchema,
  metadataResultSchema
} from "./schemas/analysis.js";

export function extractMetadata(client: InteractionGateway, source: SourceInput) {
  return client.analyze(
    METADATA_PROMPT,
    source,
    metadataJsonSchema,
    metadataResultSchema
  );
}
