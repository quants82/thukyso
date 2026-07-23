import { loadEnvironment } from "@thukyso/config";
import { createSystemQueue } from "./queue.js";
import { workerStatus } from "./status.js";

const environment = loadEnvironment();
const queue = createSystemQueue(environment.REDIS_URL, environment.REDIS_PREFIX);
await queue.waitUntilReady();

console.log("Thư Ký Số worker", workerStatus(true));

async function shutdown() {
  await queue.close();
  process.exitCode = 0;
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
