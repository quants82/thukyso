import { describe, expect, it, vi } from "vitest";
import type { DependencyHealth } from "./infrastructure.tokens.js";
import { HealthService } from "./health.service.js";

function dependency(result: "up" | "down"): DependencyHealth {
  return {
    ping: result === "up" ? vi.fn().mockResolvedValue(undefined) : vi.fn().mockRejectedValue(new Error("down"))
  };
}

describe("HealthService", () => {
  it("reports ok when PostgreSQL and Redis are available", async () => {
    const service = new HealthService(dependency("up"), dependency("up"));
    await expect(service.check()).resolves.toEqual({
      status: "ok",
      database: "up",
      redis: "up"
    });
  });

  it("reports degraded without hiding the failing dependency", async () => {
    const service = new HealthService(dependency("up"), dependency("down"));
    await expect(service.check()).resolves.toEqual({
      status: "degraded",
      database: "up",
      redis: "down"
    });
  });
});
