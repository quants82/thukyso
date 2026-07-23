import { describe, expect, it } from "vitest";
import { loadEnvironment, redisConnectionOptions } from "./index.js";

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
