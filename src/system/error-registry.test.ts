import { describe, it, expect } from "vitest";
import { ERR, kindOf, type RqgErrorEntry } from "./error-registry";

describe("error-registry", () => {
  const entries = Object.values(ERR) as RqgErrorEntry[];

  it("every code matches the format for its kind", () => {
    for (const entry of entries) {
      const pattern = kindOf(entry.code) === "bug" ? /^RQG-B\d{4}$/ : /^RQG-W\d{4}$/;
      expect(entry.code, `${entry.code} (${kindOf(entry.code)})`).toMatch(pattern);
    }
  });

  it("codes are unique", () => {
    const codes = entries.map((e) => e.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("every entry has a non-empty message", () => {
    for (const entry of entries) {
      expect(entry.message.trim().length).toBeGreaterThan(0);
    }
  });

  it("every world entry's message is an RQG.* translation key", () => {
    for (const entry of entries) {
      if (kindOf(entry.code) === "world") {
        expect(entry.message).toMatch(/^RQG\./);
      }
    }
  });

  it("kindOf derives from the code prefix", () => {
    expect(kindOf("RQG-B0001")).toBe("bug");
    expect(kindOf("RQG-W0001")).toBe("world");
  });
});
