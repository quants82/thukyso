import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("exports the Drive connection application", () => {
    expect(App).toBeTypeOf("function");
  });
});
