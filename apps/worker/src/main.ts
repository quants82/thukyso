import { loadWorkerEnvironment, redisConnectionOptions } from "@thukyso/config";
import { GeminiInteractionsClient } from "@thukyso/gemini";
import { Worker } from "bullmq";
import Redis from "ioredis";
import { AnalysisProcessor } from "./analysis.processor.js";
import { AnalysisRepository } from "./analysis.repository.js";
import { DriveClient } from "./drive-client.js";
import { createDocumentQueue, DOCUMENT_QUEUE_NAME } from "./queue.js";
import { DriveScanner } from "./scanner.js";
import { ScannerRepository } from "./scanner.repository.js";
import { workerStatus } from "./status.js";
import { ComparisonProcessor } from "./comparison.processor.js";
import { PrismaClient } from "@prisma/client";

const environment = loadWorkerEnvironment();
const queue = createDocumentQueue(environment.REDIS_URL, environment.REDIS_PREFIX);
const redis = new Redis(redisConnectionOptions(environment.REDIS_URL));
const repository = new ScannerRepository(environment.TOKEN_ENCRYPTION_KEY);
const analysisRepository = new AnalysisRepository(environment.TOKEN_ENCRYPTION_KEY);
const drive = new DriveClient(
  environment.GOOGLE_CLIENT_ID,
  environment.GOOGLE_CLIENT_SECRET
);
const scanner = new DriveScanner(
  drive,
  repository,
  queue,
  redis,
  environment.REDIS_PREFIX,
  environment.MAX_DOCUMENT_SIZE_MB * 1024 * 1024
);
const analysisProcessor = new AnalysisProcessor(
  drive,
  analysisRepository,
  new GeminiInteractionsClient(environment.GEMINI_API_KEY, environment.GEMINI_MODEL),
  environment.GEMINI_MODEL,
  environment.MAX_DOCUMENT_SIZE_MB * 1024 * 1024,
  environment.MAX_EXTRACTED_TEXT_CHARS
);
const comparisonPrisma = new PrismaClient();
const comparisonProcessor = new ComparisonProcessor(
  comparisonPrisma,
  new GeminiInteractionsClient(environment.GEMINI_API_KEY, environment.GEMINI_MODEL),
  environment.GEMINI_MODEL
);
const analysisWorker = new Worker(
  DOCUMENT_QUEUE_NAME,
  (job) =>
    job.name === "compare-documents"
      ? comparisonProcessor.process(job)
      : analysisProcessor.process(job),
  {
    connection: redisConnectionOptions(environment.REDIS_URL),
    prefix: environment.REDIS_PREFIX,
    concurrency: environment.WORKER_CONCURRENCY
  }
);
analysisWorker.on("error", (error) => {
  console.error("Analysis worker error", {
    error: error instanceof Error ? error.message : "UNKNOWN_WORKER_ERROR"
  });
});

await Promise.all([
  queue.waitUntilReady(),
  analysisWorker.waitUntilReady(),
  redis.ping()
]);
console.log("Thư Ký Số worker", {
  ...workerStatus(true),
  scanIntervalMs: environment.WORKER_SCAN_INTERVAL_MS,
  analysisConcurrency: environment.WORKER_CONCURRENCY,
  geminiModel: environment.GEMINI_MODEL
});

let activeScan: Promise<void> | undefined;
const scan = () => {
  if (activeScan) return;
  activeScan = scanner
    .scanAll()
    .catch((error: unknown) => {
      console.error("Drive scan failed", error);
    })
    .finally(() => {
      activeScan = undefined;
    });
};

scan();
const timer = setInterval(scan, environment.WORKER_SCAN_INTERVAL_MS);

let shuttingDown = false;
async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  clearInterval(timer);
  await activeScan;
  await analysisWorker.close();
  await Promise.all([
    queue.close(),
    redis.quit(),
    repository.close(),
    analysisRepository.close()
    , comparisonPrisma.$disconnect()
  ]);
  process.exitCode = 0;
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
