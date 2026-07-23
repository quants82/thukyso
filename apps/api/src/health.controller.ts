import { Controller, Get } from "@nestjs/common";

export const phaseZeroHealth = {
  status: "ok",
  phase: 0,
  service: "api"
} as const;

@Controller("health")
export class HealthController {
  @Get()
  getHealth() {
    return phaseZeroHealth;
  }
}
