import { Module } from "@nestjs/common";
import { InfrastructureModule } from "../infrastructure.module.js";
import { AuthController } from "./auth.controller.js";
import { AuthRepository } from "./auth.repository.js";
import { AuthService } from "./auth.service.js";
import { GoogleOauthService } from "./google-oauth.service.js";
import { OauthStateService } from "./oauth-state.service.js";

@Module({
  imports: [InfrastructureModule],
  controllers: [AuthController],
  providers: [AuthRepository, AuthService, GoogleOauthService, OauthStateService]
})
export class AuthModule {}
