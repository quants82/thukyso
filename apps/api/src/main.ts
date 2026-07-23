import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";

const app = await NestFactory.create(AppModule);
app.setGlobalPrefix("api/v1");
app.enableCors({ origin: "http://localhost:5173", credentials: true });

const port = Number(process.env.API_PORT ?? 3000);
await app.listen(port, "0.0.0.0");
console.log(`Thư Ký Số API đang chạy tại http://localhost:${port}/api/v1`);
