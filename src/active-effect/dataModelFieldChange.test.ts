import { describe, expect, it, vi } from "vitest";
import { applyItemChangeThroughDataModel } from "./dataModelFieldChange";

describe("applyItemChangeThroughDataModel", () => {
  it("prefers DataModel getFieldForProperty when available", () => {
    const applyChange = vi.fn(() => 14);
    const item = {
      system: {
        _source: { characteristics: { strength: { value: 10 } } },
        characteristics: { strength: { value: 10 } },
        getFieldForProperty: vi.fn(() => ({ applyChange })),
        schema: {
          getField: vi.fn(() => undefined),
        },
      },
    } as any;

    const result = applyItemChangeThroughDataModel(
      item,
      "system.characteristics.strength.value",
      {
        key: "~i.skill.any:system.characteristics.strength.value",
        mode: 0 as any,
        priority: 0,
        value: "4",
      },
      { pow: 18 },
    );

    expect(result).toEqual({ applied: true, value: 14 });
    expect(item.system.getFieldForProperty).toHaveBeenCalledWith("characteristics.strength.value");
    expect(item.system.schema.getField).not.toHaveBeenCalled();
    expect(applyChange).toHaveBeenCalledWith(
      10,
      item.system,
      expect.objectContaining({ type: "add" }),
      { replacementData: { pow: 18 } },
    );
  });

  it("applies supported system paths via DataModel field operations", () => {
    const applyChange = vi.fn(() => 13);
    const item = {
      system: {
        _source: { characteristics: { strength: { value: 10 } } },
        characteristics: { strength: { value: 10 } },
        schema: {
          getField: vi.fn(() => ({ applyChange })),
        },
      },
    } as any;

    const result = applyItemChangeThroughDataModel(
      item,
      "system.characteristics.strength.value",
      {
        key: "~i.skill.any:system.characteristics.strength.value",
        mode: 0 as any,
        priority: 0,
        value: "3",
      },
      { pow: 18 },
    );

    expect(result).toEqual({ applied: true, value: 13 });
    expect(item.system.schema.getField).toHaveBeenCalledWith("characteristics.strength.value", {
      source: item.system._source,
    });
    expect(applyChange).toHaveBeenCalledWith(
      10,
      item.system,
      expect.objectContaining({ type: "add" }),
      { replacementData: { pow: 18 } },
    );
  });

  it("falls back when path is outside system", () => {
    const item = { system: { schema: { getField: vi.fn() } } } as any;

    const result = applyItemChangeThroughDataModel(
      item,
      "name",
      { key: "x:name", mode: 0 as any, priority: 0, value: "1" },
      {},
    );

    expect(result).toEqual({ applied: false, reason: "path-not-in-item-system" });
  });

  it("falls back when schema field cannot be resolved", () => {
    const item = {
      system: {
        schema: {
          getField: vi.fn(() => undefined),
        },
      },
    } as any;

    const result = applyItemChangeThroughDataModel(
      item,
      "system.attributes.magicPoints.max",
      { key: "x:system.attributes.magicPoints.max", mode: 0 as any, priority: 0, value: "1" },
      {},
    );

    expect(result).toEqual({ applied: false, reason: "field-unresolved" });
  });

  it("falls back when field apply throws", () => {
    const item = {
      system: {
        attributes: { magicPoints: { max: 10 } },
        schema: {
          getField: vi.fn(() => ({
            applyChange: vi.fn(() => {
              throw new Error("boom");
            }),
          })),
        },
      },
    } as any;

    const result = applyItemChangeThroughDataModel(
      item,
      "system.attributes.magicPoints.max",
      { key: "x:system.attributes.magicPoints.max", mode: 0 as any, priority: 0, value: "1" },
      {},
    );

    expect(result.applied).toBe(false);
    if (!result.applied) {
      expect(result.reason).toBe("field-apply-failed");
      expect(result.error).toBeInstanceOf(Error);
    }
  });
});
