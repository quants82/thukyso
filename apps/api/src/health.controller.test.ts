import { describe, expect, it } from "vitest";
import { HealthController, phaseZeroHealth } from "./health.controller.js";

describe("HealthController", () => {
  it("returns the Phase 0 health payload", () => {
    expect(new HealthController().getHealth()).toEqual(phaseZeroHealth);
  });
});
