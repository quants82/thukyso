import "../test-env.js";
import { describe, expect, it } from "vitest";
import { DriveStateService } from "./drive-state.service.js";

describe("DriveStateService", () => {
  it("round-trips a signed state bound to the user", () => {
    const service = new DriveStateService();
    const created = service.create("user-1");
    expect(service.verify(created.cookieValue, created.state)).toMatchObject({
      userId: "user-1",
      state: created.state
    });
  });

  it("rejects a mismatched state", () => {
    const service = new DriveStateService();
    const created = service.create("user-1");
    expect(() => service.verify(created.cookieValue, "wrong")).toThrow(
      "Drive OAuth state đã hết hạn hoặc không khớp"
    );
  });
});
