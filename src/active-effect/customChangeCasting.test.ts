import { describe, expect, it, vi } from "vitest";
import { castCustomChangeArray, castCustomChangeDelta } from "./customChangeCasting";

describe("castCustomChangeDelta", () => {
  it("casts booleans using Foundry truthiness semantics", () => {
    expect(castCustomChangeDelta("false", "boolean")).toBe(true);
    expect(castCustomChangeDelta("true", "boolean")).toBe(true);
    expect(castCustomChangeDelta("", "boolean")).toBe(false);
  });

  it("casts numbers and falls back to 0 for invalid values", () => {
    expect(castCustomChangeDelta("4.5", "number")).toBe(4.5);
    expect(castCustomChangeDelta("NaN", "number")).toBe(0);
  });

  it("casts strings without parsing json", () => {
    expect(castCustomChangeDelta(42, "string")).toBe("42");
  });

  it("returns raw values for non-primitive target types", () => {
    expect(castCustomChangeDelta('{"foo":1}', "Object")).toBe('{"foo":1}');
    expect(castCustomChangeDelta("not-json", "Object")).toBe("not-json");
  });

  it("resolves @ data references before casting when Roll replacement is available", () => {
    const originalRoll = (globalThis as any).Roll;
    const replaceFormulaData = vi.fn((raw: string, data: Record<string, unknown>) => {
      if (raw === "@pow") {
        return String(data["pow"] ?? 0);
      }
      return raw;
    });

    (globalThis as any).Roll = {
      defaultImplementation: {
        replaceFormulaData,
      },
    };

    expect(castCustomChangeDelta("@pow", "number", { pow: 18 })).toBe(18);
    expect(replaceFormulaData).toHaveBeenCalledWith(
      "@pow",
      { pow: 18 },
      { recursive: true, warn: true },
    );

    (globalThis as any).Roll = originalRoll;
  });
});

describe("castCustomChangeArray", () => {
  it("casts array elements to typed inner values", () => {
    expect(castCustomChangeArray(["1", "2"], "number")).toEqual([1, 2]);
  });

  it("wraps non-array values before casting without JSON parsing", () => {
    expect(castCustomChangeArray('["1", "2"]', "number")).toEqual([0]);
    expect(castCustomChangeArray("5", "number")).toEqual([5]);
  });

  it("casts array elements to booleans", () => {
    expect(castCustomChangeArray(["false", "true", 0, 1], "boolean")).toEqual([
      true,
      true,
      false,
      true,
    ]);
  });
});
