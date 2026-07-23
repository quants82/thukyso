import { Controller, Get, Inject, ServiceUnavailableException } from "@nestjs/common";
import { HealthService } from "./health.service.js";

@Controller("health")
export class HealthController {
  constructor(@Inject(HealthService) private readonly healthService: HealthService) {}

  @Get()
  async getHealth() {
    const health = await this.healthService.check();
    if (health.status !== "ok") {
      throw new ServiceUnavailableException({
        ...health,
        message: "Một hoặc nhiều dịch vụ phụ thuộc không sẵn sàng"
      });
    }
    return health;
  }
}
