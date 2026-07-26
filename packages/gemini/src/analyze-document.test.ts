import { describe, expect, it, vi } from "vitest";
import { analyzeDocument } from "./analyze-document.js";
import type { InteractionGateway } from "./client.js";

const evidence = {
  page: 1,
  section: "Mục 1",
  quote: "Trích dẫn",
  confidence: 0.9
};

describe("analyzeDocument", () => {
  it("chạy năm lượt độc lập và hợp nhất kết quả đã kiểm chứng", async () => {
    const results = [
      {
        document: {
          number: "01/QĐ",
          issuedDate: "2026-07-27",
          issuer: "Đơn vị A",
          subject: "Nội dung",
          documentType: "Quyết định"
        },
        evidence: [evidence],
        confidence: 0.9
      },
      {
        tasks: [
          {
            title: "Thực hiện",
            description: null,
            responsibleUnit: "Phòng A",
            assignees: [],
            evidence
          }
        ],
        deadlines: [],
        confidence: 0.8
      },
      {
        executiveSummary: "Tóm tắt",
        keyPoints: [{ text: "Ý chính", evidence }],
        confidence: 0.7
      },
      {
        importantFindings: [
          { type: "REQUIRES_REVIEW", title: "Kiểm tra", detail: null, evidence }
        ],
        confidence: 0.6
      },
      {
        attachments: [],
        reportRequirements: [],
        confidence: 0.5
      }
    ];
    const client: InteractionGateway = {
      analyze: vi.fn().mockImplementation(() => Promise.resolve(results.shift()))
    };

    const result = await analyzeDocument(client, { kind: "text", text: "Nội dung" });

    expect(client.analyze).toHaveBeenCalledTimes(5);
    expect(result.document.number).toBe("01/QĐ");
    expect(result.tasks).toHaveLength(1);
    expect(result.confidence).toBeCloseTo(0.7);
  });

  it("từ chối kết quả thiếu bằng chứng bắt buộc", async () => {
    const client: InteractionGateway = {
      analyze: vi.fn().mockResolvedValue({
        document: {
          number: null,
          issuedDate: null,
          issuer: null,
          subject: null,
          documentType: null
        },
        evidence: [],
        confidence: 1
      })
    };

    await expect(
      analyzeDocument(client, { kind: "text", text: "Nội dung" })
    ).rejects.toThrow();
  });
});
