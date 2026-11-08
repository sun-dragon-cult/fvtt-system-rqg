import { describe, expect, it } from "vitest";
import { offeredOr } from "./util";

describe("offeredOr", () => {
  const options = [{ value: "auto" }, { value: "self" }];

  it("keeps a value the select offers", () => {
    expect(offeredOr("self", options, "auto")).toBe("self");
  });

  it("falls back for a missing or unknown value", () => {
    expect(offeredOr(undefined, options, "auto")).toBe("auto");
    expect(offeredOr("crystal", options, "auto")).toBe("auto");
  });
});
