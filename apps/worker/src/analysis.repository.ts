import {
  PrismaClient,
  type DocumentStatus,
  type Prisma
} from "@prisma/client";
import {
  SCHEMA_VERSION,
  type DocumentAnalysis,
  type Evidence
} from "@thukyso/gemini";
import { decryptRefreshToken } from "./token-crypto.js";

export interface AnalysisSource {
  jobId: string;
  jobKey: string;
  organizationId: string;
  documentId: string;
  driveFileId: string;
  mimeType: string;
  sha256: string;
  refreshToken: string;
}

interface EncryptedToken {
  encryptedRefreshToken: string | null;
  tokenIv: string | null;
  tokenAuthTag: string | null;
}

export class AnalysisRepository {
  constructor(
    private readonly encryptionKey: string,
    readonly prisma = new PrismaClient()
  ) {}

  async claim(jobKey: string, attempt: number): Promise<AnalysisSource | null> {
    const job = await this.prisma.$transaction(async (tx) => {
      const current = await tx.job.findUnique({
        where: { jobKey },
        include: {
          document: {
            include: {
              driveConnection: {
                include: {
                  user: {
                    select: {
                      oauthAccounts: {
                        where: {
                          provider: "google",
                          scopes: {
                            has: "https://www.googleapis.com/auth/drive.file"
                          }
                        },
                        select: {
                          encryptedRefreshToken: true,
                          tokenIv: true,
                          tokenAuthTag: true
                        },
                        take: 1
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });
      if (!current) throw new Error("ANALYSIS_JOB_NOT_FOUND");
      if (current.status === "COMPLETED") return null;
      if (!current.document?.sha256) throw new Error("ANALYSIS_SOURCE_NOT_FOUND");

      await tx.job.update({
        where: { id: current.id },
        data: {
          status: "RUNNING",
          attempts: attempt,
          startedAt: new Date(),
          completedAt: null,
          errorMessage: null
        }
      });
      await tx.document.update({
        where: { id: current.document.id },
        data: { status: "DOWNLOADING", errorCode: null, errorMessage: null }
      });
      return current;
    });
    if (!job?.document) return null;

    const account = job.document.driveConnection.user.oauthAccounts[0];
    return {
      jobId: job.id,
      jobKey: job.jobKey,
      organizationId: job.organizationId,
      documentId: job.document.id,
      driveFileId: job.document.driveFileId,
      mimeType: job.document.mimeType,
      sha256: job.document.sha256!,
      refreshToken: this.decryptAccount(account)
    };
  }

  setDocumentStatus(documentId: string, status: DocumentStatus) {
    return this.prisma.document.update({
      where: { id: documentId },
      data: { status }
    });
  }

  async complete(
    source: AnalysisSource,
    model: string,
    analysis: DocumentAnalysis
  ) {
    await this.prisma.$transaction(async (tx) => {
      const saved = await tx.documentAnalysis.upsert({
        where: {
          documentId_sourceSha256_schemaVersion_model: {
            documentId: source.documentId,
            sourceSha256: source.sha256,
            schemaVersion: SCHEMA_VERSION,
            model
          }
        },
        update: {
          executiveSummary: analysis.executiveSummary,
          result: analysis as Prisma.InputJsonValue,
          confidence: analysis.confidence
        },
        create: {
          documentId: source.documentId,
          sourceSha256: source.sha256,
          model,
          schemaVersion: SCHEMA_VERSION,
          executiveSummary: analysis.executiveSummary,
          result: analysis as Prisma.InputJsonValue,
          confidence: analysis.confidence
        }
      });
      await tx.analysisFinding.deleteMany({ where: { analysisId: saved.id } });
      const findings = [
        ...analysis.keyPoints.map((item) =>
          finding(saved.id, "KEY_POINT", item.text, null, item.evidence)
        ),
        ...analysis.importantFindings.map((item) =>
          finding(saved.id, item.type, item.title, item.detail, item.evidence)
        )
      ];
      if (findings.length) {
        await tx.analysisFinding.createMany({ data: findings });
      }
      await tx.document.update({
        where: { id: source.documentId },
        data: {
          status: "REVIEW_REQUIRED",
          errorCode: null,
          errorMessage: null
        }
      });
      await tx.job.update({
        where: { id: source.jobId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          errorMessage: null
        }
      });
      await tx.auditLog.create({
        data: {
          organizationId: source.organizationId,
          action: "DOCUMENT_ANALYSIS_COMPLETED",
          entityType: "Document",
          entityId: source.documentId,
          metadata: {
            jobKey: source.jobKey,
            model,
            schemaVersion: SCHEMA_VERSION,
            sourceSha256: source.sha256
          }
        }
      });
    });
  }

  async fail(
    source: AnalysisSource,
    errorCode: string,
    attempt: number,
    willRetry: boolean
  ) {
    const safeCode = errorCode.slice(0, 200);
    await this.prisma.$transaction([
      this.prisma.job.update({
        where: { id: source.jobId },
        data: {
          status: willRetry ? "PENDING" : "FAILED",
          attempts: attempt,
          errorMessage: safeCode,
          completedAt: willRetry ? null : new Date()
        }
      }),
      this.prisma.document.update({
        where: { id: source.documentId },
        data: {
          status: willRetry ? "QUEUED" : "FAILED",
          errorCode: safeCode,
          errorMessage: safeCode
        }
      }),
      this.prisma.auditLog.create({
        data: {
          organizationId: source.organizationId,
          action: willRetry
            ? "DOCUMENT_ANALYSIS_RETRY"
            : "DOCUMENT_ANALYSIS_FAILED",
          entityType: "Document",
          entityId: source.documentId,
          metadata: { jobKey: source.jobKey, attempt, code: safeCode }
        }
      })
    ]);
  }

  close() {
    return this.prisma.$disconnect();
  }

  private decryptAccount(account: EncryptedToken | undefined) {
    if (
      !account?.encryptedRefreshToken ||
      !account.tokenIv ||
      !account.tokenAuthTag
    ) {
      throw new Error("DRIVE_REAUTH_REQUIRED");
    }
    return decryptRefreshToken(
      {
        ciphertext: account.encryptedRefreshToken,
        iv: account.tokenIv,
        authTag: account.tokenAuthTag
      },
      this.encryptionKey
    );
  }
}

function finding(
  analysisId: string,
  type: string,
  title: string,
  detail: string | null,
  evidence: Evidence
): Prisma.AnalysisFindingCreateManyInput {
  return {
    analysisId,
    type,
    title,
    detail,
    page: evidence.page,
    section: evidence.section,
    quote: evidence.quote,
    confidence: evidence.confidence
  };
}
