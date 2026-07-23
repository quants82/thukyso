import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterEach, describe, it, vi } from "vitest";
import { HealthController } from "./health.controller.js";
import { HealthService } from "./health.service.js";
import { DATABASE_HEALTH, REDIS_HEALTH } from "./infrastructure.tokens.js";
import { requestIdMiddleware } from "./request-id.middleware.js";

describe("GET /api/v1/health", () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it("returns dependency status and propagates request ID", async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        HealthService,
        { provide: DATABASE_HEALTH, useValue: { ping: vi.fn().mockResolvedValue(undefined) } },
        { provide: REDIS_HEALTH, useValue: { ping: vi.fn().mockResolvedValue(undefined) } }
      ]
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.use(requestIdMiddleware);
    await app.init();

    await request(app.getHttpServer())
      .get("/api/v1/health")
      .set("x-request-id", "integration-test-id")
      .expect("x-request-id", "integration-test-id")
      .expect(200)
      .expect({ status: "ok", database: "up", redis: "up" });
  });
});
