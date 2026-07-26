import { describe, expect, it } from "vitest";
import {
  loadApiEnvironment,
  loadEnvironment,
  loadWorkerEnvironment,
  redisConnectionOptions
} from "./index.js";

describe("loadEnvironment", () => {
  it("parses required infrastructure settings", () => {
    expect(
      loadEnvironment(
        {
          NODE_ENV: "test",
          API_HOST: "127.0.0.1",
          API_PORT: "3100",
          APP_URL: "https://thukyso.example",
          DATABASE_URL: "postgresql://user:pass@localhost:5432/app",
          REDIS_URL: "redis://localhost:6379/2",
          REDIS_PREFIX: "test-prefix"
        },
        { loadFile: false }
      )
    ).toEqual({
      NODE_ENV: "test",
      API_HOST: "127.0.0.1",
      API_PORT: 3100,
      APP_URL: "https://thukyso.example",
      DATABASE_URL: "postgresql://user:pass@localhost:5432/app",
      REDIS_URL: "redis://localhost:6379/2",
      REDIS_PREFIX: "test-prefix"
    });
  });

  it("fails fast when required settings are missing", () => {
    expect(() => loadEnvironment({}, { loadFile: false })).toThrow(
      "Cấu hình môi trường không hợp lệ"
    );
  });

  it("validates API security settings separately from worker settings", () => {
    expect(() =>
      loadApiEnvironment(
        {
          DATABASE_URL: "postgresql://user:pass@localhost:5432/app",
          REDIS_URL: "redis://localhost:6379/2"
        },
        { loadFile: false }
      )
    ).toThrow("COOKIE_SECRET");
  });

  it("validates isolated Drive worker settings", () => {
    expect(
      loadWorkerEnvironment(
        {
          NODE_ENV: "test",
          DATABASE_URL: "postgresql://user:pass@localhost:5432/app",
          REDIS_URL: "redis://localhost:6379/2",
          GOOGLE_SERVICE_ACCOUNT_KEY_FILE: "/secure/service-account.json",
          WORKER_SCAN_INTERVAL_MS: "60000",
          MAX_DOCUMENT_SIZE_MB: "25"
        },
        { loadFile: false }
      )
    ).toMatchObject({
      GOOGLE_SERVICE_ACCOUNT_KEY_FILE: "/secure/service-account.json",
      WORKER_SCAN_INTERVAL_MS: 60000,
      MAX_DOCUMENT_SIZE_MB: 25
    });
  });
});

describe("redisConnectionOptions", () => {
  it("keeps Redis database isolation", () => {
    expect(redisConnectionOptions("redis://user:secret@127.0.0.1:6380/3")).toMatchObject({
      host: "127.0.0.1",
      port: 6380,
      username: "user",
      password: "secret",
      db: 3
    });
  });
});
