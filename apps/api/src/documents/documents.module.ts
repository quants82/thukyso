import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { DocumentsController } from "./documents.controller.js";
import { DocumentsRepository } from "./documents.repository.js";
import { DocumentsService } from "./documents.service.js";

@Module({
  imports: [AuthModule],
  controllers: [DocumentsController],
  providers: [DocumentsRepository, DocumentsService]
})
export class DocumentsModule {}
