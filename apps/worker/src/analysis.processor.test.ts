import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { AnalysisProcessor } from "./analysis.processor.js";

const bytes = new TextEncoder().encode("%PDF test");
const sha256 = createHash("sha256").update(bytes).digest("hex");
const source = {
  jobId: "job-1",
  jobKey: `analyze:connection-1:file-1:${sha256}`,
  organizationId: "organization-1",
  documentId: "document-1",
  driveFileId: "file-1",
  mimeType: "application/pdf",
  sha256,
  refreshToken: "refresh-token"
};
const evidence = {
  page: 1,
  section: "Mục 1",
  quote: "Trích dẫn",
  confidence: 0.9
};
const passResults = [
  {
    document: {
      number: null,
      issuedDate: null,
      issuer: null,
      subject: "Nội dung",
      documentType: null
    },
    evidence: [evidence],
    confidence: 0.9
  },
  { tasks: [], deadlines: [], confidence: 0.8 },
  {
    executiveSummary: "Tóm tắt",
    keyPoints: [{ text: "Ý chính", evidence }],
    confidence: 0.7
  },
  { importantFindings: [], confidence: 0.6 },
  { attachments: [], reportRequirements: [], confidence: 0.5 }
];

function job(data: unknown, attemptsMade = 0) {
  return {
    name: "analyze-document",
    data,
    attemptsMade,
    opts: { attempts: 5 }
  };
}

describe("AnalysisProcessor", () => {
  it("tải, kiểm tra checksum, chạy năm lượt và hoàn tất idempotent", async () => {
    const drive = { download: vi.fn().mockResolvedValue(bytes) };
    const repository = {
      claim: vi.fn().mockResolvedValue(source),
      setDocumentStatus: vi.fn(),
      complete: vi.fn(),
      fail: vi.fn()
    };
    const results = [...passResults];
    const gemini = {
      analyze: vi.fn().mockImplementation(() => Promise.resolve(results.shift()))
    };
    const processor = new AnalysisProcessor(
      drive as never,
      repository as never,
      gemini as never,
      "gemini-2.5-flash",
      1024,
      10_000
    );

    await processor.process(
      job({
        driveConnectionId: "connection-1",
        driveFileId: "file-1",
        sha256
      }) as never
    );

    expect(drive.download).toHaveBeenCalledWith(
      "file-1",
      1024,
      "refresh-token"
    );
    expect(gemini.analyze).toHaveBeenCalledTimes(5);
    expect(repository.complete).toHaveBeenCalledWith(
      source,
      "gemini-2.5-flash",
      expect.objectContaining({ executiveSummary: "Tóm tắt" })
    );
    expect(repository.fail).not.toHaveBeenCalled();
  });

  it("không gọi Gemini khi job đã hoàn tất", async () => {
    const repository = {
      claim: vi.fn().mockResolvedValue(null),
      setDocumentStatus: vi.fn(),
      complete: vi.fn(),
      fail: vi.fn()
    };
    const gemini = { analyze: vi.fn() };
    const processor = new AnalysisProcessor(
      { download: vi.fn() } as never,
      repository as never,
      gemini as never,
      "gemini-2.5-flash",
      1024,
      10_000
    );

    await processor.process(
      job({
        driveConnectionId: "connection-1",
        driveFileId: "file-1",
        sha256
      }) as never
    );

    expect(gemini.analyze).not.toHaveBeenCalled();
  });

  it("đánh dấu retry khi checksum nguồn thay đổi", async () => {
    const repository = {
      claim: vi.fn().mockResolvedValue(source),
      setDocumentStatus: vi.fn(),
      complete: vi.fn(),
      fail: vi.fn()
    };
    const processor = new AnalysisProcessor(
      { download: vi.fn().mockResolvedValue(new TextEncoder().encode("changed")) } as never,
      repository as never,
      { analyze: vi.fn() } as never,
      "gemini-2.5-flash",
      1024,
      10_000
    );

    await expect(
      processor.process(
        job({
          driveConnectionId: "connection-1",
          driveFileId: "file-1",
          sha256
        }) as never
      )
    ).rejects.toThrow("SOURCE_SHA256_CHANGED");
    expect(repository.fail).toHaveBeenCalledWith(
      source,
      "SOURCE_SHA256_CHANGED",
      1,
      true
    );
  });
});
