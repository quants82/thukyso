import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { redisConnectionOptions } from "@thukyso/config";
import Redis from "ioredis";
import type { DependencyHealth } from "./infrastructure.tokens.js";

@Injectable()
export class RedisService implements OnModuleDestroy, DependencyHealth {
  private readonly client: Redis;

  constructor() {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      throw new Error("REDIS_URL chưa được cấu hình");
    }
    this.client = new Redis(redisConnectionOptions(redisUrl));
  }

  async ping() {
    const response = await this.client.ping();
    if (response !== "PONG") {
      throw new Error("Redis không phản hồi PONG");
    }
  }

  async onModuleDestroy() {
    await this.client.quit();
  }
}
