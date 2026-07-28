import { Injectable } from "@nestjs/common";
import type { DocumentStatus, FindingReviewStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma.service.js";
import type { RequestMetadata } from "../auth/auth.types.js";

interface ListInput {
  userId: string;
  page: number;
  pageSize: number;
  status?: DocumentStatus;
  search?: string;
}

interface ReviewInput {
  userId: string;
  documentId: string;
  findingId: string;
  status: FindingReviewStatus;
  reviewedTitle: string | null;
  reviewedDetail: string | null;
  reviewNote: string | null;
  metadata: RequestMetadata;
}

@Injectable()
export class DocumentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(input: ListInput) {
    const where: Prisma.DocumentWhereInput = {
      organization: { memberships: { some: { userId: input.userId } } },
      ...(input.status ? { status: input.status } : {}),
      ...(input.search
        ? { name: { contains: input.search, mode: "insensitive" as const } }
        : {})
    };
    const membershipWhere: Prisma.DocumentWhereInput = {
      organization: { memberships: { some: { userId: input.userId } } }
    };
    const [total, items, reviewRequired, approved] = await this.prisma.$transaction([
      this.prisma.document.count({ where }),
      this.prisma.document.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
        select: {
          id: true,
          name: true,
          mimeType: true,
          sizeBytes: true,
          status: true,
          errorCode: true,
          errorMessage: true,
          createdAt: true,
          updatedAt: true,
          analyses: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              id: true,
              executiveSummary: true,
              confidence: true,
              createdAt: true,
              _count: { select: { findings: true } }
            }
          }
        }
      }),
      this.prisma.document.count({
        where: { ...membershipWhere, status: "REVIEW_REQUIRED" }
      }),
      this.prisma.document.count({
        where: { ...membershipWhere, status: "APPROVED" }
      })
    ]);
    return { total, items, summary: { reviewRequired, approved } };
  }

  detail(userId: string, documentId: string) {
    return this.prisma.document.findFirst({
      where: {
        id: documentId,
        organization: { memberships: { some: { userId } } }
      },
      select: {
        id: true,
        name: true,
        mimeType: true,
        sizeBytes: true,
        sha256: true,
        status: true,
        errorCode: true,
        errorMessage: true,
        createdAt: true,
        updatedAt: true,
        analyses: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            model: true,
            schemaVersion: true,
            executiveSummary: true,
            result: true,
            confidence: true,
            createdAt: true,
            findings: {
              orderBy: [{ type: "asc" }, { createdAt: "asc" }],
              select: {
                id: true,
                type: true,
                title: true,
                detail: true,
                page: true,
                section: true,
                quote: true,
                confidence: true,
                reviewStatus: true,
                reviewedTitle: true,
                reviewedDetail: true,
                reviewNote: true,
                reviewedAt: true,
                reviewedBy: {
                  select: { id: true, displayName: true, email: true }
                }
              }
            }
          }
        }
      }
    });
  }

  async reviewFinding(input: ReviewInput) {
    return this.prisma.$transaction(async (tx) => {
      const finding = await tx.analysisFinding.findFirst({
        where: {
          id: input.findingId,
          analysis: {
            documentId: input.documentId,
            document: {
              status: "REVIEW_REQUIRED",
              organization: { memberships: { some: { userId: input.userId } } }
            }
          }
        },
        select: {
          id: true,
          analysis: { select: { document: { select: { organizationId: true } } } }
        }
      });
      if (!finding) return null;
      const updated = await tx.analysisFinding.update({
        where: { id: finding.id },
        data: {
          reviewStatus: input.status,
          reviewedTitle: input.reviewedTitle,
          reviewedDetail: input.reviewedDetail,
          reviewNote: input.reviewNote,
          reviewedAt: new Date(),
          reviewedById: input.userId
        },
        select: {
          id: true,
          reviewStatus: true,
          reviewedTitle: true,
          reviewedDetail: true,
          reviewNote: true,
          reviewedAt: true
        }
      });
      await tx.auditLog.create({
        data: {
          organizationId: finding.analysis.document.organizationId,
          actorUserId: input.userId,
          action: "ANALYSIS_FINDING_REVIEWED",
          entityType: "AnalysisFinding",
          entityId: finding.id,
          requestId: input.metadata.requestId,
          ipAddress: input.metadata.ipAddress,
          userAgent: input.metadata.userAgent,
          metadata: {
            documentId: input.documentId,
            status: input.status,
            edited: input.status === "EDITED"
          }
        }
      });
      return updated;
    });
  }

  async approve(userId: string, documentId: string, metadata: RequestMetadata) {
    return this.prisma.$transaction(async (tx) => {
      const document = await tx.document.findFirst({
        where: {
          id: documentId,
          organization: { memberships: { some: { userId } } }
        },
        select: {
          id: true,
          status: true,
          organizationId: true,
          analyses: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              id: true,
              findings: { select: { reviewStatus: true } }
            }
          }
        }
      });
      if (!document) return { kind: "not-found" as const };
      if (document.status !== "REVIEW_REQUIRED" && document.status !== "APPROVED") {
        return { kind: "invalid-status" as const };
      }
      const analysis = document.analyses[0];
      if (!analysis) return { kind: "no-analysis" as const };
      if (analysis.findings.some((finding) => finding.reviewStatus === "PENDING")) {
        return { kind: "pending-findings" as const };
      }
      if (document.status !== "APPROVED") {
        await tx.document.update({
          where: { id: document.id },
          data: { status: "APPROVED" }
        });
        await tx.auditLog.create({
          data: {
            organizationId: document.organizationId,
            actorUserId: userId,
            action: "DOCUMENT_REVIEW_APPROVED",
            entityType: "Document",
            entityId: document.id,
            requestId: metadata.requestId,
            ipAddress: metadata.ipAddress,
            userAgent: metadata.userAgent,
            metadata: { analysisId: analysis.id, findingCount: analysis.findings.length }
          }
        });
      }
      return { kind: "approved" as const };
    });
  }
}
