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
