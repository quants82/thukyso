import { describe, expect, it } from "vitest";
import { workerStatus } from "./status.js";

describe("workerStatus", () => {
  it("stays idle until BullMQ is introduced", () => {
    expect(workerStatus()).toEqual({ status: "idle", phase: 0, queueConnected: false });
  });
});
