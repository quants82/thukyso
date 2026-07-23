import { describe, expect, it } from "vitest";
import { workerStatus } from "./status.js";

describe("workerStatus", () => {
  it("reports BullMQ readiness", () => {
    expect(workerStatus(true)).toEqual({ status: "ready", phase: 1, queueConnected: true });
  });
});
