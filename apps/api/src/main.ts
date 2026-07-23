import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { loadApiEnvironment } from "@thukyso/config";
import { AppModule } from "./app.module.js";
import type { Express } from "express";
import { GlobalExceptionFilter } from "./global-exception.filter.js";
import { requestIdMiddleware } from "./request-id.middleware.js";
import { requestLoggerMiddleware } from "./request-logger.middleware.js";

const environment = loadApiEnvironment();
const app = await NestFactory.create(AppModule);
const express = app.getHttpAdapter().getInstance() as Express;
express.disable("x-powered-by");
express.set("trust proxy", "loopback");
app.setGlobalPrefix("api/v1");
app.enableCors({ origin: environment.APP_URL, credentials: true });
app.use(requestIdMiddleware);
app.use(requestLoggerMiddleware);
app.useGlobalFilters(new GlobalExceptionFilter());
app.enableShutdownHooks();

const port = environment.API_PORT;
await app.listen(port, environment.API_HOST);
console.log(`Thư Ký Số API đang chạy tại http://${environment.API_HOST}:${port}/api/v1`);
