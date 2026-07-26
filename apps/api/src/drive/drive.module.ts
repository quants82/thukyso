import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { DriveController } from "./drive.controller.js";
import { DriveRepository } from "./drive.repository.js";
import { DriveService } from "./drive.service.js";
import { DriveStateService } from "./drive-state.service.js";
import { GoogleDriveService } from "./google-drive.service.js";

@Module({
  imports: [AuthModule],
  controllers: [DriveController],
  providers: [DriveRepository, DriveService, DriveStateService, GoogleDriveService]
})
export class DriveModule {}
