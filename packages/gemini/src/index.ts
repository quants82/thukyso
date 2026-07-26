export {
  GeminiInteractionsClient,
  type InteractionGateway,
  type SourceInput
} from "./client.js";
export { analyzeDocument } from "./analyze-document.js";
export { extractMetadata } from "./extract-metadata.js";
export { extractTasks } from "./extract-tasks.js";
export { summarizeDocument } from "./summarize-document.js";
export { analyzeRisks } from "./analyze-risks.js";
export { detectTemplate } from "./detect-template.js";
export { validateAnalysis } from "./validate-analysis.js";
export {
  SCHEMA_VERSION,
  documentAnalysisSchema,
  type DocumentAnalysis,
  type Evidence
} from "./schemas/analysis.js";
