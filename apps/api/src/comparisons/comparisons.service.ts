import { BadRequestException, Injectable, NotFoundException, OnModuleDestroy } from "@nestjs/common";
import { loadApiEnvironment, redisConnectionOptions } from "@thukyso/config";
import { Queue } from "bullmq";
import { PrismaService } from "../prisma.service.js";

const COMPARISON_SCHEMA_VERSION = "phase7.v1";
@Injectable()
export class ComparisonsService implements OnModuleDestroy {
  private readonly environment = loadApiEnvironment();
  private readonly queue = new Queue("documents", {
    connection: redisConnectionOptions(this.environment.REDIS_URL),
    prefix: this.environment.REDIS_PREFIX
  });

  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, sourceId?: string, targetId?: string) {
    if (!sourceId || !targetId || sourceId === targetId) {
      throw new BadRequestException("Phải chọn hai văn bản khác nhau");
    }
    const documents = await this.prisma.document.findMany({
      where: {
        id: { in: [sourceId, targetId] },
        sha256: { not: null },
        organization: { memberships: { some: { userId } } },
        analyses: { some: {} }
      },
      select: { id: true, organizationId: true, sha256: true }
    });
    const source = documents.find((item) => item.id === sourceId);
    const target = documents.find((item) => item.id === targetId);
    if (!source || !target || source.organizationId !== target.organizationId) {
      throw new BadRequestException("Hai văn bản phải đã phân tích và thuộc cùng tổ chức");
    }
    const comparison = await this.prisma.documentComparison.upsert({
      where: {
        sourceDocumentId_targetDocumentId_sourceSha256_targetSha256_schemaVersion_model: {
          sourceDocumentId: source.id,
          targetDocumentId: target.id,
          sourceSha256: source.sha256!,
          targetSha256: target.sha256!,
          schemaVersion: COMPARISON_SCHEMA_VERSION,
          model: "WORKER_CONFIGURED"
        }
      },
      create: {
        sourceDocumentId: source.id,
        targetDocumentId: target.id,
        sourceSha256: source.sha256!,
        targetSha256: target.sha256!,
        schemaVersion: COMPARISON_SCHEMA_VERSION,
        model: "WORKER_CONFIGURED",
        requestedById: userId
      },
      update: {},
      select: { id: true, status: true }
    });
    if (comparison.status === "PENDING") {
      await this.queue.add("compare-documents", { comparisonId: comparison.id }, {
        jobId: `compare-${comparison.id}`,
        attempts: 3,
        backoff: { type: "exponential", delay: 5_000 },
        removeOnComplete: 1_000,
        removeOnFail: 5_000
      });
    }
    return comparison;
  }

  async get(userId: string, id: string) {
    const comparison = await this.prisma.documentComparison.findFirst({
      where: {
        id,
        sourceDocument: { organization: { memberships: { some: { userId } } } }
      },
      include: {
        sourceDocument: { select: { id: true, name: true } },
        targetDocument: { select: { id: true, name: true } }
      }
    });
    if (!comparison) throw new NotFoundException("Không tìm thấy kết quả so sánh");
    return comparison;
  }

  async onModuleDestroy() {
    await this.queue.close();
  }
}
