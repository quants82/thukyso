import { BadRequestException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { DocumentsService } from "./documents.service.js";

const documentId = "11111111-1111-4111-8111-111111111111";
const findingId = "22222222-2222-4222-8222-222222222222";

describe("DocumentsService", () => {
  it("normalizes pagination and bigint values", async () => {
    const repository = {
      list: vi.fn().mockResolvedValue({
        total: 1,
        summary: { reviewRequired: 1, approved: 3 },
        items: [
          {
            id: documentId,
            sizeBytes: 123n,
            analyses: [
              {
                id: "analysis-1",
                findings: [
                  {
                    type: "DEADLINE",
                    confidence: 0.95,
                    page: 2,
                    section: "Điều 3",
                    quote: "Trước ngày 15/8",
                    reviewStatus: "PENDING"
                  },
                  {
                    type: "REQUIRES_REVIEW",
                    confidence: 0.9,
                    page: 1,
                    section: null,
                    quote: "Chưa rõ",
                    reviewStatus: "PENDING"
                  }
                ]
              }
            ]
          }
        ]
      })
    };
    const service = new DocumentsService(repository as never);
    const result = await service.list("user-1", {
      page: "2",
      pageSize: "10",
      status: "REVIEW_REQUIRED",
      search: "quyết định"
    });
    expect(repository.list).toHaveBeenCalledWith({
      userId: "user-1",
      page: 2,
      pageSize: 10,
      status: "REVIEW_REQUIRED",
      search: "quyết định"
    });
    expect(result.items[0]).toMatchObject({
      sizeBytes: "123",
      analysis: { id: "analysis-1", findingCount: 1 }
    });
    expect(result.summary).toEqual({ reviewRequired: 1, approved: 3 });
  });

  it("rejects invalid list input", async () => {
    const service = new DocumentsService({ list: vi.fn() } as never);
    await expect(service.list("user-1", { pageSize: "101" })).rejects.toBeInstanceOf(
      BadRequestException
    );
    await expect(service.list("user-1", { status: "UNKNOWN" })).rejects.toBeInstanceOf(
      BadRequestException
    );
  });

  it("requires an edited title and preserves AI fields", async () => {
    const repository = { reviewFinding: vi.fn() };
    const service = new DocumentsService(repository as never);
    await expect(
      service.reviewFinding(
        "user-1",
        documentId,
        findingId,
        { status: "EDITED", detail: "Nội dung" },
        {}
      )
    ).rejects.toBeInstanceOf(BadRequestException);

    repository.reviewFinding.mockResolvedValue({ id: findingId, reviewStatus: "EDITED" });
    await service.reviewFinding(
      "user-1",
      documentId,
      findingId,
      {
        status: "EDITED",
        title: "Tiêu đề đã kiểm tra",
        detail: "Nội dung đã kiểm tra",
        note: "Đối chiếu trang 2"
      },
      { requestId: "request-1" }
    );
    expect(repository.reviewFinding).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "EDITED",
        reviewedTitle: "Tiêu đề đã kiểm tra",
        reviewedDetail: "Nội dung đã kiểm tra",
        reviewNote: "Đối chiếu trang 2"
      })
    );
  });

  it("does not approve while ambiguous findings are pending", async () => {
    const service = new DocumentsService({
      approve: vi.fn().mockResolvedValue({ kind: "pending-findings" })
    } as never);
    await expect(service.approve("user-1", documentId, {})).rejects.toBeInstanceOf(
      BadRequestException
    );
  });

  it("returns not found only within the user's organization", async () => {
    const service = new DocumentsService({
      detail: vi.fn().mockResolvedValue(null)
    } as never);
    await expect(service.detail("user-1", documentId)).rejects.toBeInstanceOf(
      NotFoundException
    );
  });

  it("marks only ambiguous pending findings as needing human review", async () => {
    const repository = {
      detail: vi.fn().mockResolvedValue({
        id: documentId,
        sizeBytes: 100n,
        analyses: [
          {
            id: "analysis-1",
            findings: [
              {
                id: "clear",
                type: "DEADLINE",
                confidence: 0.95,
                page: 2,
                section: "Điều 3",
                quote: "Trước ngày 15/8",
                reviewStatus: "PENDING"
              },
              {
                id: "ambiguous",
                type: "REQUIRES_REVIEW",
                confidence: 0.9,
                page: 1,
                section: null,
                quote: "Chưa rõ",
                reviewStatus: "PENDING"
              },
              {
                id: "resolved",
                type: "RISK",
                confidence: 0.6,
                page: 3,
                section: null,
                quote: null,
                reviewStatus: "CONFIRMED"
              }
            ]
          }
        ]
      })
    };
    const service = new DocumentsService(repository as never);
    const result = await service.detail("user-1", documentId);
    expect(result.analysis?.findings).toEqual([
      expect.objectContaining({
        id: "clear",
        reviewReason: null,
        needsReview: false
      }),
      expect.objectContaining({
        id: "ambiguous",
        reviewReason: "AI_MARKED_FOR_REVIEW",
        needsReview: true
      }),
      expect.objectContaining({
        id: "resolved",
        reviewReason: "LOW_CONFIDENCE",
        needsReview: false
      })
    ]);
  });
});
