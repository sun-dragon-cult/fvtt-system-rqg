import { describe, expect, it } from "vitest";
import { compareVersions, findDueDeprecations } from "./check-deprecations";

describe("check-deprecations", () => {
  it("compares x.y.z versions numerically, ignoring a v prefix and prerelease suffix", () => {
    expect(compareVersions("6.10.0", "6.4.0")).toBeGreaterThan(0);
    expect(compareVersions("v6.4.0", "6.4.0")).toBe(0);
    expect(compareVersions("6.4.0-beta.1", "6.4.0")).toBe(0);
    expect(compareVersions("6.3.2", "6.4.0")).toBeLessThan(0);
  });

  it("reports deprecations due at or before the release version, with their line", () => {
    const source = [
      'warnDeprecated(a, b, { since: "6.2.0", until: "6.4.0" });',
      'warnDeprecated(c, d, { since: "6.3.0", until: "6.5.0" });',
    ].join("\n");

    expect(findDueDeprecations("x.ts", source, "6.3.0")).toEqual([]);
    expect(findDueDeprecations("x.ts", source, "6.4.0")).toEqual([
      { file: "x.ts", line: 1, until: "6.4.0" },
    ]);
    expect(findDueDeprecations("x.ts", source, "7.0.0")).toHaveLength(2);
  });
});
