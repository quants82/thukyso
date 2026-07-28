import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthService } from "../auth/auth.service.js";
import { DocumentsController } from "./documents.controller.js";
import { DocumentsService } from "./documents.service.js";

describe("documents API", () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  async function createApp() {
    const documents = {
      list: vi.fn().mockResolvedValue({
        page: 1,
        pageSize: 20,
        total: 0,
        summary: { reviewRequired: 0, approved: 0 },
        items: []
      }),
      detail: vi.fn().mockResolvedValue({ id: "document-1" }),
      reviewFinding: vi.fn().mockResolvedValue({
        id: "finding-1",
        reviewStatus: "CONFIRMED"
      }),
      approve: vi.fn().mockResolvedValue({ status: "APPROVED" })
    };
    const moduleRef = await Test.createTestingModule({
      controllers: [DocumentsController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            requireUser: vi.fn().mockResolvedValue({
              id: "user-1",
              email: "user@example.com"
            })
          }
        },
        { provide: DocumentsService, useValue: documents }
      ]
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api/v1");
    await app.init();
    return documents;
  }

  it("lists documents for the authenticated user", async () => {
    const documents = await createApp();
    await request(app!.getHttpServer())
      .get("/api/v1/documents?status=REVIEW_REQUIRED&page=1")
      .set("Cookie", "thukyso_session=session-token")
      .expect(200);
    expect(documents.list).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ status: "REVIEW_REQUIRED", page: "1" })
    );
  });

  it("reviews a finding and approves a document", async () => {
    const documents = await createApp();
    await request(app!.getHttpServer())
      .patch("/api/v1/documents/document-1/findings/finding-1")
      .set("Cookie", "thukyso_session=session-token")
      .send({ status: "CONFIRMED", note: "Đã đối chiếu" })
      .expect(200);
    await request(app!.getHttpServer())
      .post("/api/v1/documents/document-1/approve")
      .set("Cookie", "thukyso_session=session-token")
      .expect(201)
      .expect({ status: "APPROVED" });
    expect(documents.reviewFinding).toHaveBeenCalledOnce();
    expect(documents.approve).toHaveBeenCalledOnce();
  });
});
