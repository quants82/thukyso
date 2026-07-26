import {
  documentAnalysisSchema,
  type DocumentAnalysis
} from "./schemas/analysis.js";

export function validateAnalysis(input: unknown): DocumentAnalysis {
  return documentAnalysisSchema.parse(input);
}
