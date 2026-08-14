import { describe, expect, it } from "vitest";
import { AbilitySuccessLevelEnum } from "../../rolls/ability-roll/ability-roll.defs";
import { RuneMagicDataModel } from "./rune-magic-data-model";

describe("RuneMagicDataModel chance helpers", () => {
  it("chooses the strongest eligible rune by chance", () => {
    const moonRune = {
      system: { chance: 70 },
    } as Parameters<typeof RuneMagicDataModel.getStrongestRune>[0][number];
    const airRune = {
      system: { chance: 90 },
    } as Parameters<typeof RuneMagicDataModel.getStrongestRune>[0][number];

    expect(RuneMagicDataModel.getStrongestRune([moonRune, airRune])).toBe(airRune);
  });

  it("calculates cast chance from the chosen rune plus modifiers and clamps at zero", () => {
    const rune = {
      system: { chance: 55 },
    } as Parameters<typeof RuneMagicDataModel.calculateCastChance>[0];

    expect(
      RuneMagicDataModel.calculateCastChance(rune, [{ value: 20 }, { value: -10 }, { value: "5" }]),
    ).toBe(70);

    expect(RuneMagicDataModel.calculateCastChance(rune, [{ value: -80 }])).toBe(0);
  });

  it("calculates cast chance from serialized base chance values", () => {
    expect(
      RuneMagicDataModel.calculateCastChanceFromBaseChance(55, [
        { value: 20 },
        { value: -10 },
        { value: "5" },
      ]),
    ).toBe(70);

    expect(RuneMagicDataModel.calculateCastChanceFromBaseChance(55, [{ value: -80 }])).toBe(0);
    expect(RuneMagicDataModel.calculateCastChanceFromBaseChance(Number.NaN, [{ value: 10 }])).toBe(
      10,
    );
  });

  it("validates available rune and magic points for casting", () => {
    const fakeModel = {
      getCult: () => ({ system: { runePoints: { value: 4 } } }),
      parent: { actor: { system: { attributes: { magicPoints: { value: 7 } } } } },
    } as unknown as RuneMagicDataModel;

    expect(
      RuneMagicDataModel.prototype.getCastValidationError.call(fakeModel, 3, 2),
    ).toBeUndefined();
    expect(RuneMagicDataModel.prototype.getCastValidationError.call(fakeModel, 5, 2)).toContain(
      "RQG.Item.RuneMagic.validationNotEnoughRunePoints",
    );
    expect(RuneMagicDataModel.prototype.getCastValidationError.call(fakeModel, 3, 9)).toContain(
      "RQG.Item.RuneMagic.validationNotEnoughMagicPoints",
    );
  });

  it("counts a chosen magic point source's stored points for the boost, leaving Rune Points cult-sourced (#956)", () => {
    const fakeModel = {
      getCult: () => ({ system: { runePoints: { value: 4 } } }),
      parent: {
        actor: {
          items: [
            {
              id: "crystal-1",
              type: "gear",
              system: {
                storedMagicPoints: { value: 4, max: 5, identified: true },
                equippedStatus: "equipped",
                attunedTo: "Attuned",
              },
            },
          ],
          system: { attributes: { magicPoints: { value: 1 } } },
          getFlag: () => undefined,
        },
      },
    } as unknown as RuneMagicDataModel;

    // Only 1 MP of the caster's own pool - not enough for a boost of 3 without a source.
    expect(RuneMagicDataModel.prototype.getCastValidationError.call(fakeModel, 3, 3)).toContain(
      "RQG.Item.RuneMagic.validationNotEnoughMagicPoints",
    );

    // Picking the crystal covers the boost; Rune Points are still validated against the cult.
    expect(
      RuneMagicDataModel.prototype.getCastValidationError.call(fakeModel, 3, 3, "crystal-1"),
    ).toBeUndefined();
    expect(
      RuneMagicDataModel.prototype.getCastValidationError.call(fakeModel, 5, 3, "crystal-1"),
    ).toContain("RQG.Item.RuneMagic.validationNotEnoughRunePoints");
  });

  it("calculates rune and magic point costs from the roll result", () => {
    expect(RuneMagicDataModel.calculatePointCosts(AbilitySuccessLevelEnum.Critical, 3, 2)).toEqual({
      rp: 0,
      mp: 2,
      exp: true,
    });
    expect(RuneMagicDataModel.calculatePointCosts(AbilitySuccessLevelEnum.Special, 3, 2)).toEqual({
      rp: 3,
      mp: 2,
      exp: true,
    });
    expect(RuneMagicDataModel.calculatePointCosts(AbilitySuccessLevelEnum.Failure, 3, 2)).toEqual({
      rp: 0,
      mp: 1,
      exp: false,
    });
    expect(RuneMagicDataModel.calculatePointCosts(AbilitySuccessLevelEnum.Fumble, 3, 0)).toEqual({
      rp: 3,
      mp: 0,
      exp: false,
    });
  });
});

describe("RuneMagicDataModel.migrateData", () => {
  it("rewrites a legacy string-typed isRitual value to a real boolean", () => {
    const migrated = RuneMagicDataModel.migrateData({ isRitual: "true," });

    expect(migrated["isRitual"]).toBe(true);
  });
});
