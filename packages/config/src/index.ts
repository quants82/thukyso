import { config as loadDotEnv } from "dotenv";
import { z } from "zod";

const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_HOST: z.ipv4().default("127.0.0.1"),
  API_PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  APP_URL: z.string().url().default("http://localhost:5173"),
  DATABASE_URL: z.string().url().startsWith("postgresql://"),
  REDIS_URL: z.string().url().startsWith("redis://"),
  REDIS_PREFIX: z.string().min(1).default("thukyso")
});

export type AppEnvironment = z.infer<typeof environmentSchema>;

export function loadEnvironment(
  source: NodeJS.ProcessEnv = process.env,
  options: { loadFile?: boolean } = {}
): AppEnvironment {
  if (options.loadFile !== false) {
    loadDotEnv();
  }

  const parsed = environmentSchema.safeParse(source);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "environment"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Cấu hình môi trường không hợp lệ: ${detail}`);
  }
  return parsed.data;
}

export function redisConnectionOptions(redisUrl: string) {
  const url = new URL(redisUrl);
  const databasePath = url.pathname.replace("/", "");

  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 6379,
    username: url.username || undefined,
    password: url.password || undefined,
    db: databasePath ? Number(databasePath) : 0,
    maxRetriesPerRequest: null
  };
}
