import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Post,
  Query,
  Req,
  Res
} from "@nestjs/common";
import { loadApiEnvironment } from "@thukyso/config";
import { parse, serialize } from "cookie";
import type { Request, Response } from "express";
import { AuthService } from "../auth/auth.service.js";
import { SESSION_COOKIE } from "../auth/auth.constants.js";
import type { RequestMetadata } from "../auth/auth.types.js";
import { DRIVE_OAUTH_STATE_COOKIE } from "./drive.constants.js";
import { DriveStateService } from "./drive-state.service.js";
import { DriveService } from "./drive.service.js";

@Controller("drive")
export class DriveController {
  private readonly environment = loadApiEnvironment();

  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(DriveService) private readonly drive: DriveService,
    @Inject(DriveStateService) private readonly state: DriveStateService
  ) {}

  @Post("authorize")
  async authorize(@Req() request: Request, @Res() response: Response) {
    const user = await this.auth.requireUser(this.sessionToken(request));
    const state = this.state.create(user.id);
    response.setHeader(
      "Set-Cookie",
      this.cookie(
        DRIVE_OAUTH_STATE_COOKIE,
        state.cookieValue,
        new Date(Date.now() + 10 * 60 * 1000)
      )
    );
    response.status(200).json({ authorizationUrl: this.drive.authorizationUrl(state.state) });
  }

  @Get("oauth/callback")
  async callback(
    @Query("code") code: string | undefined,
    @Query("state") returnedState: string | undefined,
    @Req() request: Request,
    @Res() response: Response
  ) {
    if (!code) {
      response.status(400).json({ message: "Google Drive authorization code bị thiếu" });
      return;
    }
    const cookies = parse(request.headers.cookie ?? "");
    const user = await this.auth.requireUser(cookies[SESSION_COOKIE]);
    const state = this.state.verify(cookies[DRIVE_OAUTH_STATE_COOKIE], returnedState);
    if (state.userId !== user.id) {
      response.status(401).json({ message: "Google Drive authorization không thuộc phiên hiện tại" });
      return;
    }
    await this.drive.finishAuthorization(user.id, code);
    response.setHeader("Set-Cookie", this.clearCookie(DRIVE_OAUTH_STATE_COOKIE));
    response.redirect(302, `${this.environment.APP_URL}/?drive=authorized`);
  }

  @Get("picker-token")
  async pickerToken(@Req() request: Request) {
    const user = await this.auth.requireUser(this.sessionToken(request));
    return this.drive.pickerConfiguration(user.id);
  }

  @Post("connect-folder")
  async connectFolder(
    @Body() body: { folderId?: string; scanExistingFiles?: boolean },
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response
  ) {
    const user = await this.auth.requireUser(this.sessionToken(request));
    return this.drive.connectFolder(user, body, this.metadata(request, response));
  }

  @Post("change-folder")
  async changeFolder(
    @Body() body: { folderId?: string; scanExistingFiles?: boolean },
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response
  ) {
    const user = await this.auth.requireUser(this.sessionToken(request));
    return this.drive.connectFolder(user, body, this.metadata(request, response));
  }

  @Post("queue-files")
  async queueFiles(@Body() body: { fileIds?: unknown }, @Req() request: Request) {
    const user = await this.auth.requireUser(this.sessionToken(request));
    return this.drive.queueFiles(user.id, body.fileIds);
  }

  @Get("connection")
  async connection(@Req() request: Request) {
    const user = await this.auth.requireUser(this.sessionToken(request));
    return this.drive.connection(user.id);
  }

  @Delete("connection")
  @HttpCode(204)
  async disconnect(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response
  ) {
    const user = await this.auth.requireUser(this.sessionToken(request));
    await this.drive.disconnect(user.id, this.metadata(request, response));
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

  private cookie(name: string, value: string, expires: Date) {
    return serialize(name, value, {
      httpOnly: true,
      secure: this.environment.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires
    });
  }

  private clearCookie(name: string) {
    return serialize(name, "", {
      httpOnly: true,
      secure: this.environment.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(0),
      maxAge: 0
    });
  }
}
