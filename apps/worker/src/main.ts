import { loadWorkerEnvironment, redisConnectionOptions } from "@thukyso/config";
import Redis from "ioredis";
import { DriveClient } from "./drive-client.js";
import { createDocumentQueue } from "./queue.js";
import { DriveScanner } from "./scanner.js";
import { ScannerRepository } from "./scanner.repository.js";
import { workerStatus } from "./status.js";

const environment = loadWorkerEnvironment();
const queue = createDocumentQueue(environment.REDIS_URL, environment.REDIS_PREFIX);
const redis = new Redis(redisConnectionOptions(environment.REDIS_URL));
const repository = new ScannerRepository();
const scanner = new DriveScanner(
  new DriveClient(environment.GOOGLE_SERVICE_ACCOUNT_KEY_FILE),
  repository,
  queue,
  redis,
  environment.REDIS_PREFIX,
  environment.MAX_DOCUMENT_SIZE_MB * 1024 * 1024
);

await Promise.all([queue.waitUntilReady(), redis.ping()]);
console.log("Thư Ký Số worker", {
  ...workerStatus(true),
  scanIntervalMs: environment.WORKER_SCAN_INTERVAL_MS
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
  await Promise.all([queue.close(), redis.quit(), repository.close()]);
  process.exitCode = 0;
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
