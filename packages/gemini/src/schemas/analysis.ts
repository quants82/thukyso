import { z } from "zod";

export const SCHEMA_VERSION = "phase5.v1";

const nullableString = z.string().nullable();
const evidenceSchema = z.object({
  page: z.number().int().positive().nullable(),
  section: nullableString,
  quote: nullableString,
  confidence: z.number().min(0).max(1)
});

export const metadataResultSchema = z.object({
  document: z.object({
    number: nullableString,
    issuedDate: nullableString,
    issuer: nullableString,
    subject: nullableString,
    documentType: nullableString
  }),
  evidence: z.array(evidenceSchema),
  confidence: z.number().min(0).max(1)
});

const taskSchema = z.object({
  title: z.string().min(1),
  description: nullableString,
  responsibleUnit: nullableString,
  assignees: z.array(z.string()),
  evidence: evidenceSchema
});

const deadlineSchema = z.object({
  value: nullableString,
  description: z.string().min(1),
  relatedTask: nullableString,
  evidence: evidenceSchema
});

export const tasksResultSchema = z.object({
  tasks: z.array(taskSchema),
  deadlines: z.array(deadlineSchema),
  confidence: z.number().min(0).max(1)
});

export const summaryResultSchema = z.object({
  executiveSummary: z.string(),
  keyPoints: z.array(
    z.object({
      text: z.string().min(1),
      evidence: evidenceSchema
    })
  ),
  confidence: z.number().min(0).max(1)
});

export const risksResultSchema = z.object({
  importantFindings: z.array(
    z.object({
      type: z.enum([
        "RISK",
        "REQUIRES_REVIEW",
        "LEGAL_BASIS",
        "FINANCIAL",
        "DEADLINE",
        "RESPONSIBILITY",
        "OTHER"
      ]),
      title: z.string().min(1),
      detail: nullableString,
      evidence: evidenceSchema
    })
  ),
  confidence: z.number().min(0).max(1)
});

const namedRequirementSchema = z.object({
  name: z.string().min(1),
  description: nullableString,
  evidence: evidenceSchema
});

export const attachmentsResultSchema = z.object({
  attachments: z.array(namedRequirementSchema),
  reportRequirements: z.array(namedRequirementSchema),
  confidence: z.number().min(0).max(1)
});

export const documentAnalysisSchema = z.object({
  document: metadataResultSchema.shape.document,
  executiveSummary: z.string(),
  tasks: z.array(taskSchema),
  deadlines: z.array(deadlineSchema),
  importantFindings: risksResultSchema.shape.importantFindings,
  attachments: z.array(namedRequirementSchema),
  reportRequirements: z.array(namedRequirementSchema),
  keyPoints: summaryResultSchema.shape.keyPoints,
  confidence: z.number().min(0).max(1)
});

export type Evidence = z.infer<typeof evidenceSchema>;
export type MetadataResult = z.infer<typeof metadataResultSchema>;
export type TasksResult = z.infer<typeof tasksResultSchema>;
export type SummaryResult = z.infer<typeof summaryResultSchema>;
export type RisksResult = z.infer<typeof risksResultSchema>;
export type AttachmentsResult = z.infer<typeof attachmentsResultSchema>;
export type DocumentAnalysis = z.infer<typeof documentAnalysisSchema>;

const evidenceJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    page: {
      type: ["integer", "null"],
      minimum: 1,
      description: "Số trang 1-based; null nếu nguồn không có thông tin trang."
    },
    section: {
      type: ["string", "null"],
      description: "Tên mục/phần nguyên văn; null nếu không xác định."
    },
    quote: {
      type: ["string", "null"],
      description: "Trích dẫn nguồn ngắn, chính xác; không diễn giải."
    },
    confidence: { type: "number", minimum: 0, maximum: 1 }
  },
  required: ["page", "section", "quote", "confidence"]
} as const;

const namedRequirementJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: { type: "string" },
    description: { type: ["string", "null"] },
    evidence: evidenceJsonSchema
  },
  required: ["name", "description", "evidence"]
} as const;

export const metadataJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    document: {
      type: "object",
      additionalProperties: false,
      properties: {
        number: { type: ["string", "null"] },
        issuedDate: { type: ["string", "null"] },
        issuer: { type: ["string", "null"] },
        subject: { type: ["string", "null"] },
        documentType: { type: ["string", "null"] }
      },
      required: ["number", "issuedDate", "issuer", "subject", "documentType"]
    },
    evidence: { type: "array", items: evidenceJsonSchema },
    confidence: { type: "number", minimum: 0, maximum: 1 }
  },
  required: ["document", "evidence", "confidence"]
} as const;

export const tasksJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    tasks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          description: { type: ["string", "null"] },
          responsibleUnit: { type: ["string", "null"] },
          assignees: { type: "array", items: { type: "string" } },
          evidence: evidenceJsonSchema
        },
        required: ["title", "description", "responsibleUnit", "assignees", "evidence"]
      }
    },
    deadlines: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          value: { type: ["string", "null"] },
          description: { type: "string" },
          relatedTask: { type: ["string", "null"] },
          evidence: evidenceJsonSchema
        },
        required: ["value", "description", "relatedTask", "evidence"]
      }
    },
    confidence: { type: "number", minimum: 0, maximum: 1 }
  },
  required: ["tasks", "deadlines", "confidence"]
} as const;

export const summaryJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    executiveSummary: { type: "string" },
    keyPoints: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          text: { type: "string" },
          evidence: evidenceJsonSchema
        },
        required: ["text", "evidence"]
      }
    },
    confidence: { type: "number", minimum: 0, maximum: 1 }
  },
  required: ["executiveSummary", "keyPoints", "confidence"]
} as const;

export const risksJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    importantFindings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          type: {
            type: "string",
            enum: [
              "RISK",
              "REQUIRES_REVIEW",
              "LEGAL_BASIS",
              "FINANCIAL",
              "DEADLINE",
              "RESPONSIBILITY",
              "OTHER"
            ]
          },
          title: { type: "string" },
          detail: { type: ["string", "null"] },
          evidence: evidenceJsonSchema
        },
        required: ["type", "title", "detail", "evidence"]
      }
    },
    confidence: { type: "number", minimum: 0, maximum: 1 }
  },
  required: ["importantFindings", "confidence"]
} as const;

export const attachmentsJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    attachments: { type: "array", items: namedRequirementJsonSchema },
    reportRequirements: { type: "array", items: namedRequirementJsonSchema },
    confidence: { type: "number", minimum: 0, maximum: 1 }
  },
  required: ["attachments", "reportRequirements", "confidence"]
} as const;
