import { workerStatus } from "./status.js";

console.log("Thư Ký Số worker placeholder", workerStatus());

const keepAlive = setInterval(() => undefined, 60_000);

function shutdown() {
  clearInterval(keepAlive);
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
