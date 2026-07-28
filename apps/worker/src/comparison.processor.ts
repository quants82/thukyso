import { PrismaClient } from "@prisma/client";
import { compareDocuments, type InteractionGateway } from "@thukyso/gemini";
import type { Job } from "bullmq";

export class ComparisonProcessor {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly gemini: InteractionGateway,
    private readonly model: string
  ) {}

  async process(job: Job) {
    if (job.name !== "compare-documents") return;
    const comparisonId = this.comparisonId(job.data);
    const comparison = await this.prisma.documentComparison.findUnique({
      where: { id: comparisonId },
      include: {
        sourceDocument: { include: { analyses: { orderBy: { createdAt: "desc" }, take: 1 } } },
        targetDocument: { include: { analyses: { orderBy: { createdAt: "desc" }, take: 1 } } }
      }
    });
    if (!comparison || comparison.status === "COMPLETED") return;
    const source = comparison.sourceDocument.analyses[0];
    const target = comparison.targetDocument.analyses[0];
    if (!source || !target) throw new Error("COMPARISON_ANALYSIS_MISSING");
    try {
      const result = await compareDocuments(
        this.gemini,
        JSON.stringify(source.result),
        JSON.stringify(target.result)
      );
      await this.prisma.$transaction([
        this.prisma.documentComparison.update({
          where: { id: comparison.id },
          data: { status: "COMPLETED", result, errorCode: null, errorMessage: null }
        }),
        this.prisma.auditLog.create({
          data: {
            organizationId: comparison.sourceDocument.organizationId,
            actorUserId: comparison.requestedById,
            action: "DOCUMENT_COMPARISON_COMPLETED",
            entityType: "DocumentComparison",
            entityId: comparison.id,
            metadata: {
              sourceDocumentId: comparison.sourceDocumentId,
              targetDocumentId: comparison.targetDocumentId,
              model: this.model
            }
          }
        })
      ]);
    } catch (error) {
      const finalAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
      if (finalAttempt) {
        await this.prisma.documentComparison.update({
          where: { id: comparison.id },
          data: {
            status: "FAILED",
            errorCode: "COMPARISON_PROVIDER_ERROR",
            errorMessage: error instanceof Error ? error.message.slice(0, 500) : "UNKNOWN"
          }
        });
      }
      throw error;
    }
  }

  private comparisonId(data: unknown) {
    if (!data || typeof data !== "object" || !("comparisonId" in data) ||
        typeof data.comparisonId !== "string") {
      throw new Error("INVALID_COMPARISON_JOB_PAYLOAD");
    }
    return data.comparisonId;
  }
}
