import { redisConnectionOptions } from "@thukyso/config";
import { Queue } from "bullmq";

export const SYSTEM_QUEUE_NAME = "system";

export function createSystemQueue(redisUrl: string, prefix: string) {
  return new Queue(SYSTEM_QUEUE_NAME, {
    connection: redisConnectionOptions(redisUrl),
    prefix
  });
}
