import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { DocumentStatus, FindingReviewStatus } from "@prisma/client";
import type { RequestMetadata } from "../auth/auth.types.js";
import { DocumentsRepository } from "./documents.repository.js";
import type { DocumentListQuery, ReviewFindingInput } from "./documents.types.js";
import { findingReviewReason } from "./finding-review.policy.js";

const documentStatuses = new Set(Object.values(DocumentStatus));
const reviewStatuses = new Set<FindingReviewStatus>([
  FindingReviewStatus.CONFIRMED,
  FindingReviewStatus.DISMISSED,
  FindingReviewStatus.EDITED
]);

@Injectable()
export class DocumentsService {
  constructor(
    @Inject(DocumentsRepository) private readonly repository: DocumentsRepository
  ) {}

  async list(userId: string, query: DocumentListQuery) {
    const page = this.integer(query.page, 1, 1, 10_000, "page");
    const pageSize = this.integer(query.pageSize, 20, 1, 100, "pageSize");
    const status = query.status?.trim();
    if (status && !documentStatuses.has(status as DocumentStatus)) {
      throw new BadRequestException("Trạng thái văn bản không hợp lệ");
    }
    const search = query.search?.trim();
    if (search && search.length > 200) {
      throw new BadRequestException("Từ khóa tìm kiếm quá dài");
    }
    const result = await this.repository.list({
      userId,
      page,
      pageSize,
      status: status as DocumentStatus | undefined,
      search: search || undefined
    });
    return {
      page,
      pageSize,
      total: result.total,
      totalPages: Math.ceil(result.total / pageSize),
      summary: result.summary,
      items: result.items.map((document) => ({
        ...document,
        sizeBytes: document.sizeBytes?.toString() ?? null,
        analysis: document.analyses[0]
          ? {
              ...document.analyses[0],
              findingCount: document.analyses[0].findings.filter(
                (finding) =>
                  finding.reviewStatus === "PENDING" &&
                  findingReviewReason(finding) !== null
              ).length,
              findings: undefined
            }
          : null,
        analyses: undefined
      }))
    };
  }

  async detail(userId: string, documentId: string) {
    this.uuid(documentId);
    const document = await this.repository.detail(userId, documentId);
    if (!document) throw new NotFoundException("Không tìm thấy văn bản");
    const analysis = document.analyses[0];
    return {
      ...document,
      sizeBytes: document.sizeBytes?.toString() ?? null,
      analysis: analysis
        ? {
            ...analysis,
            findings: analysis.findings.map((finding) => {
              const reviewReason = findingReviewReason(finding);
              return {
                ...finding,
                reviewReason,
                needsReview:
                  finding.reviewStatus === "PENDING" && reviewReason !== null
              };
            })
          }
        : null,
      analyses: undefined
    };
  }

  async reviewFinding(
    userId: string,
    documentId: string,
    findingId: string,
    body: ReviewFindingInput,
    metadata: RequestMetadata
  ) {
    this.uuid(documentId);
    this.uuid(findingId);
    if (!body.status || !reviewStatuses.has(body.status)) {
      throw new BadRequestException("Trạng thái review không hợp lệ");
    }
    const title = this.optionalText(body.title, 300, "Tiêu đề");
    const detail = this.optionalText(body.detail, 5_000, "Nội dung");
    const note = this.optionalText(body.note, 2_000, "Ghi chú");
    if (body.status === "EDITED" && !title) {
      throw new BadRequestException("Tiêu đề đã chỉnh sửa là bắt buộc");
    }
    const result = await this.repository.reviewFinding({
      userId,
      documentId,
      findingId,
      status: body.status,
      reviewedTitle: body.status === "EDITED" ? title : null,
      reviewedDetail: body.status === "EDITED" ? detail : null,
      reviewNote: note,
      metadata
    });
    if (!result) throw new NotFoundException("Không tìm thấy điểm phân tích");
    return result;
  }

  async approve(userId: string, documentId: string, metadata: RequestMetadata) {
    this.uuid(documentId);
    const result = await this.repository.approve(userId, documentId, metadata);
    if (result.kind === "not-found") throw new NotFoundException("Không tìm thấy văn bản");
    if (result.kind === "no-analysis") {
      throw new BadRequestException("Văn bản chưa có kết quả phân tích");
    }
    if (result.kind === "invalid-status") {
      throw new BadRequestException("Văn bản chưa sẵn sàng để phê duyệt");
    }
    if (result.kind === "pending-findings") {
      throw new BadRequestException("Cần review tất cả điểm phân tích trước khi phê duyệt");
    }
    return { status: "APPROVED" };
  }

  private integer(
    value: string | undefined,
    fallback: number,
    minimum: number,
    maximum: number,
    field: string
  ) {
    if (value === undefined) return fallback;
    if (!/^\d+$/.test(value)) throw new BadRequestException(`${field} không hợp lệ`);
    const parsed = Number(value);
    if (parsed < minimum || parsed > maximum) {
      throw new BadRequestException(`${field} không hợp lệ`);
    }
    return parsed;
  }

  private optionalText(
    value: string | null | undefined,
    maximum: number,
    label: string
  ) {
    if (value === undefined || value === null) return null;
    if (typeof value !== "string") throw new BadRequestException(`${label} không hợp lệ`);
    const text = value.trim();
    if (text.length > maximum) throw new BadRequestException(`${label} quá dài`);
    return text || null;
  }

  private uuid(value: string) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
      throw new BadRequestException("ID không hợp lệ");
    }
  }
}
