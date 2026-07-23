import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller.js";
import { HealthService } from "./health.service.js";
import { DATABASE_HEALTH, REDIS_HEALTH } from "./infrastructure.tokens.js";
import { PrismaService } from "./prisma.service.js";
import { RedisService } from "./redis.service.js";
import { AuthModule } from "./auth/auth.module.js";
import { InfrastructureModule } from "./infrastructure.module.js";

@Module({
  imports: [InfrastructureModule, AuthModule],
  controllers: [HealthController],
  providers: [
    HealthService,
    { provide: DATABASE_HEALTH, useExisting: PrismaService },
    { provide: REDIS_HEALTH, useExisting: RedisService }
  ]
})
export class AppModule {}
