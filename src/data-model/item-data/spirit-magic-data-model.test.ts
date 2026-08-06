import { describe, expect, it } from "vitest";
import { SpiritMagicDataModel } from "./spirit-magic-data-model";

describe("SpiritMagicDataModel cast validation", () => {
  it("validates learned level and available magic points", () => {
    const fakeModel = {
      points: 3,
      parent: { actor: { system: { attributes: { magicPoints: { value: 6 } } } } },
    } as unknown as SpiritMagicDataModel;

    expect(
      SpiritMagicDataModel.prototype.getCastValidationError.call(fakeModel, 2, 1),
    ).toBeUndefined();

    expect(SpiritMagicDataModel.prototype.getCastValidationError.call(fakeModel, 4, 0)).toContain(
      "RQG.Item.SpiritMagic.CantCastSpellAboveLearnedLevel",
    );

    expect(SpiritMagicDataModel.prototype.getCastValidationError.call(fakeModel, 3, 4)).toContain(
      "RQG.Item.SpiritMagic.NotEnoughMagicPoints",
    );
  });
});

describe("SpiritMagicDataModel.migrateData", () => {
  it("rewrites a legacy string-typed isRitual value to a real boolean", () => {
    const migrated = SpiritMagicDataModel.migrateData({ isRitual: "true," });

    expect(migrated["isRitual"]).toBe(true);
  });
});
