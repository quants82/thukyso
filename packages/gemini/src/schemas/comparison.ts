import { z } from "zod";

export const COMPARISON_SCHEMA_VERSION = "phase7.v1";

const evidence = z.object({
  page: z.number().int().positive().nullable(),
  section: z.string().nullable(),
  quote: z.string().nullable()
});

const change = z.object({
  category: z.enum(["ADDED", "CHANGED", "REMOVED", "UNCHANGED", "UNCLEAR"]),
  topic: z.string().min(1),
  oldRule: z.string().nullable(),
  newRule: z.string().nullable(),
  practicalImpact: z.string().nullable(),
  actionRequired: z.string().nullable(),
  sourceEvidence: evidence.nullable(),
  targetEvidence: evidence.nullable(),
  confidence: z.number().min(0).max(1),
  needsReview: z.boolean()
});

export const comparisonResultSchema = z.object({
  relationship: z.string(),
  executiveSummary: z.string(),
  changes: z.array(change).max(30),
  unresolvedQuestions: z.array(z.string()).max(20),
  confidence: z.number().min(0).max(1)
});

export const comparisonJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    relationship: { type: "string" },
    executiveSummary: { type: "string" },
    changes: {
      type: "array",
      maxItems: 30,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          category: { type: "string", enum: ["ADDED", "CHANGED", "REMOVED", "UNCHANGED", "UNCLEAR"] },
          topic: { type: "string" }, oldRule: { type: ["string", "null"] },
          newRule: { type: ["string", "null"] }, practicalImpact: { type: ["string", "null"] },
          actionRequired: { type: ["string", "null"] },
          sourceEvidence: { anyOf: [{ type: "null" }, { $ref: "#/$defs/evidence" }] },
          targetEvidence: { anyOf: [{ type: "null" }, { $ref: "#/$defs/evidence" }] },
          confidence: { type: "number", minimum: 0, maximum: 1 }, needsReview: { type: "boolean" }
        },
        required: ["category","topic","oldRule","newRule","practicalImpact","actionRequired","sourceEvidence","targetEvidence","confidence","needsReview"]
      }
    },
    unresolvedQuestions: { type: "array", maxItems: 20, items: { type: "string" } },
    confidence: { type: "number", minimum: 0, maximum: 1 }
  },
  required: ["relationship","executiveSummary","changes","unresolvedQuestions","confidence"],
  $defs: { evidence: { type: "object", additionalProperties: false, properties: {
    page: { type: ["integer","null"], minimum: 1 }, section: { type: ["string","null"] }, quote: { type: ["string","null"] }
  }, required: ["page","section","quote"] } }
} as const;

export type ComparisonResult = z.infer<typeof comparisonResultSchema>;
