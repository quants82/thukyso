import { createHash } from "node:crypto";
import { analyzeDocument, type InteractionGateway } from "@thukyso/gemini";
import type { Job } from "bullmq";
import mammoth from "mammoth";
import { AnalysisRepository, type AnalysisSource } from "./analysis.repository.js";
import { DriveClient } from "./drive-client.js";

const PDF_MIME = "application/pdf";
const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export class AnalysisProcessor {
  constructor(
    private readonly drive: DriveClient,
    private readonly repository: AnalysisRepository,
    private readonly gemini: InteractionGateway,
    private readonly model: string,
    private readonly maxBytes: number,
    private readonly maxExtractedTextChars: number
  ) {}

  async process(job: Job) {
    if (job.name !== "analyze-document") return;
    const jobKey = parseJobKey(job.data);
    const attempt = job.attemptsMade + 1;
    let source: AnalysisSource | null = null;
    try {
      source = await this.repository.claim(jobKey, attempt);
      if (!source) return;
      const bytes = await this.drive.download(
        source.driveFileId,
        this.maxBytes,
        source.refreshToken
      );
      const actualSha256 = createHash("sha256").update(bytes).digest("hex");
      if (actualSha256 !== source.sha256) {
        throw new Error("SOURCE_SHA256_CHANGED");
      }

      await this.repository.setDocumentStatus(source.documentId, "EXTRACTING");
      const input = await this.prepareInput(source.mimeType, bytes);
      await this.repository.setDocumentStatus(source.documentId, "ANALYZING");
      const analysis = await analyzeDocument(this.gemini, input);
      await this.repository.complete(source, this.model, analysis);
    } catch (error) {
      const code = safeErrorCode(error);
      if (source) {
        const maxAttempts =
          typeof job.opts.attempts === "number" ? job.opts.attempts : 1;
        await this.repository.fail(source, code, attempt, attempt < maxAttempts);
      }
      throw error;
    }
  }

  private async prepareInput(mimeType: string, bytes: Uint8Array) {
    if (mimeType === PDF_MIME) {
      return { kind: "pdf" as const, bytes };
    }
    if (mimeType === DOCX_MIME) {
      const extracted = await mammoth.extractRawText({
        buffer: Buffer.from(bytes)
      });
      const text = extracted.value.trim();
      if (!text) throw new Error("DOCX_TEXT_EMPTY");
      if (text.length > this.maxExtractedTextChars) {
        throw new Error("EXTRACTED_TEXT_TOO_LARGE");
      }
      return { kind: "text" as const, text };
    }
    throw new Error("UNSUPPORTED_MIME_TYPE");
  }
}

function parseJobKey(data: unknown) {
  if (
    !data ||
    typeof data !== "object" ||
    !("driveConnectionId" in data) ||
    !("driveFileId" in data) ||
    !("sha256" in data) ||
    typeof data.driveConnectionId !== "string" ||
    typeof data.driveFileId !== "string" ||
    typeof data.sha256 !== "string"
  ) {
    throw new Error("INVALID_ANALYSIS_JOB_PAYLOAD");
  }
  return `analyze:${data.driveConnectionId}:${data.driveFileId}:${data.sha256}`;
}

function safeErrorCode(error: unknown) {
  if (!(error instanceof Error)) return "ANALYSIS_UNKNOWN_ERROR";
  const known = error.message.match(/^[A-Z][A-Z0-9_]{2,100}$/);
  return known ? known[0] : "ANALYSIS_PROVIDER_ERROR";
}
