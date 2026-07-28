import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res
} from "@nestjs/common";
import { parse } from "cookie";
import type { Request, Response } from "express";
import { SESSION_COOKIE } from "../auth/auth.constants.js";
import { AuthService } from "../auth/auth.service.js";
import type { RequestMetadata } from "../auth/auth.types.js";
import { DocumentsService } from "./documents.service.js";
import type { DocumentListQuery, ReviewFindingInput } from "./documents.types.js";

@Controller("documents")
export class DocumentsController {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(DocumentsService) private readonly documents: DocumentsService
  ) {}

  @Get()
  async list(@Query() query: DocumentListQuery, @Req() request: Request) {
    const user = await this.auth.requireUser(this.sessionToken(request));
    return this.documents.list(user.id, query);
  }

  @Get(":documentId")
  async detail(@Param("documentId") documentId: string, @Req() request: Request) {
    const user = await this.auth.requireUser(this.sessionToken(request));
    return this.documents.detail(user.id, documentId);
  }

  @Patch(":documentId/findings/:findingId")
  async reviewFinding(
    @Param("documentId") documentId: string,
    @Param("findingId") findingId: string,
    @Body() body: ReviewFindingInput,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response
  ) {
    const user = await this.auth.requireUser(this.sessionToken(request));
    return this.documents.reviewFinding(
      user.id,
      documentId,
      findingId,
      body,
      this.metadata(request, response)
    );
  }

  @Post(":documentId/approve")
  async approve(
    @Param("documentId") documentId: string,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response
  ) {
    const user = await this.auth.requireUser(this.sessionToken(request));
    return this.documents.approve(user.id, documentId, this.metadata(request, response));
  }

  private sessionToken(request: Request) {
    return parse(request.headers.cookie ?? "")[SESSION_COOKIE];
  }

  private metadata(request: Request, response: Response): RequestMetadata {
    return {
      requestId: response.locals.requestId as string | undefined,
      ipAddress: request.ip,
      userAgent: request.header("user-agent")
    };
  }
}
