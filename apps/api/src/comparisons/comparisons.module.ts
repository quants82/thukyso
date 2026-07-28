import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { ComparisonsController } from "./comparisons.controller.js";
import { ComparisonsService } from "./comparisons.service.js";

@Module({
  imports: [AuthModule],
  controllers: [ComparisonsController],
  providers: [ComparisonsService]
})
export class ComparisonsModule {}
