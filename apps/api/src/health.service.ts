import { Inject, Injectable } from "@nestjs/common";
import {
  DATABASE_HEALTH,
  type DependencyHealth,
  REDIS_HEALTH
} from "./infrastructure.tokens.js";

export type DependencyStatus = "up" | "down";

export interface HealthResult {
  status: "ok" | "degraded";
  database: DependencyStatus;
  redis: DependencyStatus;
}

@Injectable()
export class HealthService {
  constructor(
    @Inject(DATABASE_HEALTH) private readonly database: DependencyHealth,
    @Inject(REDIS_HEALTH) private readonly redis: DependencyHealth
  ) {}

  async check(): Promise<HealthResult> {
    const [database, redis] = await Promise.all([
      this.statusOf(this.database),
      this.statusOf(this.redis)
    ]);

    return {
      status: database === "up" && redis === "up" ? "ok" : "degraded",
      database,
      redis
    };
  }

  private async statusOf(dependency: DependencyHealth): Promise<DependencyStatus> {
    try {
      await dependency.ping();
      return "up";
    } catch {
      return "down";
    }
  }
}
