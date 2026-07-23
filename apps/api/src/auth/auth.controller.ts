import {
  Controller,
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
import { OAUTH_STATE_COOKIE, SESSION_COOKIE } from "./auth.constants.js";
import { GoogleOauthService } from "./google-oauth.service.js";
import { OauthStateService } from "./oauth-state.service.js";
import { AuthService } from "./auth.service.js";
import type { RequestMetadata } from "./auth.types.js";

@Controller("auth")
export class AuthController {
  private readonly environment = loadApiEnvironment();

  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(GoogleOauthService) private readonly google: GoogleOauthService,
    @Inject(OauthStateService) private readonly oauthState: OauthStateService
  ) {}

  @Get("google")
  startGoogleLogin(@Res() response: Response) {
    const state = this.oauthState.create();
    response.setHeader(
      "Set-Cookie",
      this.cookie(OAUTH_STATE_COOKIE, state.cookieValue, new Date(Date.now() + 10 * 60 * 1000))
    );
    response.redirect(302, this.google.createAuthorizationUrl(state.state, state.nonce));
  }

  @Get("google/callback")
  async googleCallback(
    @Query("code") code: string | undefined,
    @Query("state") returnedState: string | undefined,
    @Req() request: Request,
    @Res() response: Response
  ) {
    if (!code) {
      response.status(400).json({ message: "Google authorization code bị thiếu" });
      return;
    }
    const cookies = parse(request.headers.cookie ?? "");
    const state = this.oauthState.verify(cookies[OAUTH_STATE_COOKIE], returnedState);
    const identity = await this.google.exchangeCode(code, state.nonce);
    const session = await this.authService.finishGoogleLogin(identity, this.metadata(request, response));

    response.setHeader("Set-Cookie", [
      this.clearCookie(OAUTH_STATE_COOKIE),
      this.cookie(SESSION_COOKIE, session.token, session.expiresAt)
    ]);
    response.redirect(302, this.environment.APP_URL);
  }

  @Get("me")
  async me(@Req() request: Request) {
    return this.authService.currentUser(this.sessionToken(request));
  }

  @Post("refresh")
  @HttpCode(200)
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const session = await this.authService.refresh(
      this.sessionToken(request),
      this.metadata(request, response)
    );
    response.setHeader("Set-Cookie", this.cookie(SESSION_COOKIE, session.token, session.expiresAt));
    return { status: "ok" };
  }

  @Post("logout")
  @HttpCode(204)
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    await this.authService.logout(this.sessionToken(request), this.metadata(request, response));
    response.setHeader("Set-Cookie", this.clearCookie(SESSION_COOKIE));
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
