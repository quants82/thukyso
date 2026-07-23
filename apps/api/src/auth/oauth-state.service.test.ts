import { UnauthorizedException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { OauthStateService } from "./oauth-state.service.js";

describe("OauthStateService", () => {
  it("verifies an intact round-trip state", () => {
    const service = new OauthStateService();
    const state = service.create();
    expect(service.verify(state.cookieValue, state.state)).toMatchObject({
      state: state.state,
      nonce: state.nonce
    });
  });

  it("rejects tampered state cookies", () => {
    const service = new OauthStateService();
    const state = service.create();
    expect(() => service.verify(`${state.cookieValue}x`, state.state)).toThrow(
      UnauthorizedException
    );
  });
});
