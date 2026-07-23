import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("exports the Phase 0 landing component", () => {
    expect(App).toBeTypeOf("function");
  });
});
