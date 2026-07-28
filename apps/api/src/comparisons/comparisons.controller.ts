import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import { parse } from "cookie";
import type { Request } from "express";
import { SESSION_COOKIE } from "../auth/auth.constants.js";
import { AuthService } from "../auth/auth.service.js";
import { ComparisonsService } from "./comparisons.service.js";

@Controller("comparisons")
export class ComparisonsController {
  constructor(
    private readonly auth: AuthService,
    private readonly comparisons: ComparisonsService
  ) {}

  @Post()
  async create(
    @Body() body: { sourceDocumentId?: string; targetDocumentId?: string },
    @Req() request: Request
  ) {
    const user = await this.auth.requireUser(
      parse(request.headers.cookie ?? "")[SESSION_COOKIE]
    );
    return this.comparisons.create(
      user.id,
      body.sourceDocumentId,
      body.targetDocumentId
    );
  }

  @Get(":comparisonId")
  async get(@Param("comparisonId") id: string, @Req() request: Request) {
    const user = await this.auth.requireUser(
      parse(request.headers.cookie ?? "")[SESSION_COOKIE]
    );
    return this.comparisons.get(user.id, id);
  }
}
