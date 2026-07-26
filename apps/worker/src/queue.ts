import { redisConnectionOptions } from "@thukyso/config";
import { Queue } from "bullmq";

export const SYSTEM_QUEUE_NAME = "system";
export const DOCUMENT_QUEUE_NAME = "documents";

export function createSystemQueue(redisUrl: string, prefix: string) {
  return new Queue(SYSTEM_QUEUE_NAME, {
    connection: redisConnectionOptions(redisUrl),
    prefix
  });
}

export function createDocumentQueue(redisUrl: string, prefix: string) {
  return new Queue(DOCUMENT_QUEUE_NAME, {
    connection: redisConnectionOptions(redisUrl),
    prefix,
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: "exponential", delay: 5_000 },
      removeOnComplete: 1_000,
      removeOnFail: 5_000
    }
  });
}
