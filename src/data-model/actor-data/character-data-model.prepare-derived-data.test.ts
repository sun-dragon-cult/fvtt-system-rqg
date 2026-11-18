import { describe, expect, it } from "vitest";
import { CharacterDataModel } from "./character-data-model";
import { getCharacteristicDerivedValues } from "./derived-character-values";
import { RqgCalculations } from "../../system/rqg-calculations";
import { buildCharacterSystem as buildSystem } from "./character-data-model-test-helpers";

describe("CharacterDataModel.prepareDerivedData", () => {
  it("composes base skill modifiers with effect deltas", () => {
    const model = new CharacterDataModel({});
    const system = buildSystem();
    system.effect.add.skillCategoryModifiers.agility = 2;
    system.effect.add.skillCategoryModifiers.magic = -1;

    Object.assign(model as object, system);
    model.prepareDerivedData();

    const expectedBase = getCharacteristicDerivedValues({
      str: system.characteristics.strength.value,
      con: system.characteristics.constitution.value,
      siz: system.characteristics.size.value,
      dex: system.characteristics.dexterity.value,
      int: system.characteristics.intelligence.value,
      pow: system.characteristics.power.value,
      cha: system.characteristics.charisma.value,
      isCreature: system.attributes.isCreature,
    }).skillCategoryModifiers;

    const baseSkillCategoryModifiers = (model as unknown as { baseSkillCategoryModifiers: unknown })
      .baseSkillCategoryModifiers;
    const skillCategoryModifiers = (
      model as unknown as {
        skillCategoryModifiers: { agility: number; magic: number };
      }
    ).skillCategoryModifiers;

    expect(baseSkillCategoryModifiers).toStrictEqual(expectedBase);
    expect(skillCategoryModifiers.agility).toBe(expectedBase.agility + 2);
    expect(skillCategoryModifiers.magic).toBe(expectedBase.magic - 1);
  });

  it("uses current-cycle effect deltas for resource max values", () => {
    const model = new CharacterDataModel({});
    const system = buildSystem();
    const baseHitPoints =
      RqgCalculations.hitPoints(
        system.characteristics.constitution.value,
        system.characteristics.size.value,
        system.characteristics.power.value,
      ) ?? 0;

    Object.assign(model as object, system);

    system.effect.add.magicPoints.max = 3;
    system.effect.add.hitPoints.max = 2;
    model.prepareDerivedData();

    const cycleOneAttributes = (
      model as unknown as {
        attributes: { magicPoints: { max: number }; hitPoints: { max: number } };
      }
    ).attributes;

    expect(cycleOneAttributes.magicPoints.max).toBe(18);
    expect(cycleOneAttributes.hitPoints.max).toBe(baseHitPoints + 2);

    // Simulate the next prepare cycle using a different effects state.
    system.effect.add.magicPoints.max = 2;
    system.effect.add.hitPoints.max = 1;
    model.prepareDerivedData();

    const cycleTwoAttributes = (
      model as unknown as {
        attributes: { magicPoints: { max: number }; hitPoints: { max: number } };
      }
    ).attributes;

    expect(cycleTwoAttributes.magicPoints.max).toBe(17);
    expect(cycleTwoAttributes.hitPoints.max).toBe(baseHitPoints + 1);
  });

  it("uses current characteristic values for derived outputs", () => {
    const model = new CharacterDataModel({});
    const system = buildSystem();

    const baselineBase = getCharacteristicDerivedValues({
      str: system.characteristics.strength.value,
      con: system.characteristics.constitution.value,
      siz: system.characteristics.size.value,
      dex: system.characteristics.dexterity.value,
      int: system.characteristics.intelligence.value,
      pow: system.characteristics.power.value,
      cha: system.characteristics.charisma.value,
      isCreature: system.attributes.isCreature,
    }).skillCategoryModifiers;

    const baselineMagicPointsMax = system.characteristics.power.value;
    const baselineHitPointsMax =
      RqgCalculations.hitPoints(
        system.characteristics.constitution.value,
        system.characteristics.size.value,
        system.characteristics.power.value,
      ) ?? 0;

    // Simulate characteristic-targeting ActiveEffects having already updated the
    // prepared characteristic values before derived composition runs.
    system.characteristics.constitution.value = 14;
    system.characteristics.power.value = 18;

    Object.assign(model as object, system);
    model.prepareDerivedData();

    const expectedBase = getCharacteristicDerivedValues({
      str: system.characteristics.strength.value,
      con: system.characteristics.constitution.value,
      siz: system.characteristics.size.value,
      dex: system.characteristics.dexterity.value,
      int: system.characteristics.intelligence.value,
      pow: system.characteristics.power.value,
      cha: system.characteristics.charisma.value,
      isCreature: system.attributes.isCreature,
    }).skillCategoryModifiers;

    const expectedHitPoints =
      RqgCalculations.hitPoints(
        system.characteristics.constitution.value,
        system.characteristics.size.value,
        system.characteristics.power.value,
      ) ?? 0;

    const preparedModel = model as unknown as {
      baseSkillCategoryModifiers: { magic: number };
      attributes: {
        magicPoints: { max: number };
        hitPoints: { max: number };
      };
    };

    expect(expectedBase.magic).toBeGreaterThan(baselineBase.magic);
    expect(expectedHitPoints).toBeGreaterThan(baselineHitPointsMax);
    expect(system.characteristics.power.value).toBeGreaterThan(baselineMagicPointsMax);
    expect(preparedModel.baseSkillCategoryModifiers.magic).toBe(expectedBase.magic);
    expect(preparedModel.attributes.magicPoints.max).toBe(system.characteristics.power.value);
    expect(preparedModel.attributes.hitPoints.max).toBe(expectedHitPoints);
  });

  it("multiplies the healing rate by the effects' factor", () => {
    const model = new CharacterDataModel({});
    const system = buildSystem();
    Object.assign(model as object, system);
    model.prepareDerivedData();
    const normal = (model as unknown as { attributes: { healingRate: number } }).attributes
      .healingRate;

    system.effect.multiply.healingRate = 8;
    model.prepareDerivedData();
    const trance = (model as unknown as { attributes: { healingRate: number } }).attributes
      .healingRate;

    expect(trance).toBe(normal * 8);
  });

  it("adds the effects' strike rank and rounds halved movement down", () => {
    const model = new CharacterDataModel({});
    const system = buildSystem() as ReturnType<typeof buildSystem> & {
      attributes: { move?: unknown };
    };
    system.attributes.move = { walk: { value: 7 / 2 }, swim: { value: 1 }, fly: { value: null } };
    Object.assign(model as object, system);
    model.prepareDerivedData();
    const base = (model as unknown as { attributes: { dexStrikeRank: number } }).attributes
      .dexStrikeRank;

    system.effect.add.dexStrikeRank = 1;
    model.prepareDerivedData();
    const attributes = (
      model as unknown as {
        attributes: {
          dexStrikeRank: number;
          move: { walk: { value: number }; fly: { value: number | null } };
        };
      }
    ).attributes;

    expect(attributes.dexStrikeRank).toBe(base + 1);
    expect(attributes.move.walk.value).toBe(3);
    expect(attributes.move.fly.value).toBeNull();
  });

  describe("magic points maximum", () => {
    function preparedMagicPointsMax(
      pow: number | null,
      baseMax: number | null,
      fromEffects = 0,
    ): number {
      const model = new CharacterDataModel({});
      const system = buildSystem();
      (system.characteristics.power as { value: number | null }).value = pow;
      system.attributes.magicPoints.baseMax = baseMax;
      system.effect.add.magicPoints.max = fromEffects;
      Object.assign(model as object, system);
      model.prepareDerivedData();
      return (model as unknown as { attributes: { magicPoints: { max: number } } }).attributes
        .magicPoints.max;
    }

    it.each([
      { case: "POW only", pow: 15, baseMax: null, fromEffects: 0, expected: 15 },
      { case: "POW plus effects", pow: 15, baseMax: null, fromEffects: 3, expected: 18 },
      { case: "empty POW with baseMax", pow: null, baseMax: 21, fromEffects: 0, expected: 21 },
      { case: "baseMax overrides POW", pow: 15, baseMax: 21, fromEffects: 0, expected: 21 },
      { case: "baseMax plus effects", pow: 15, baseMax: 21, fromEffects: 2, expected: 23 },
      { case: "baseMax of 0 overrides POW", pow: 15, baseMax: 0, fromEffects: 0, expected: 0 },
      { case: "empty POW, no baseMax", pow: null, baseMax: null, fromEffects: 0, expected: 0 },
    ])("$case", ({ pow, baseMax, fromEffects, expected }) => {
      expect(preparedMagicPointsMax(pow, baseMax, fromEffects)).toBe(expected);
    });
  });
  describe("magic point recovery rate (Core p.54)", () => {
    function preparedRate(pow: number | null, baseMax: number | null, fromEffects = 0): number {
      const model = new CharacterDataModel({});
      const system = buildSystem();
      (system.characteristics.power as { value: number | null }).value = pow;
      system.attributes.magicPoints.baseMax = baseMax;
      system.effect.add.magicPoints.max = fromEffects;
      Object.assign(model as object, system);
      model.prepareDerivedData();
      return (model as unknown as { attributes: { magicPointRecoveryPointsPerDay: number } })
        .attributes.magicPointRecoveryPointsPerDay;
    }

    it("follows POW, whatever the base max or effects on the maximum", () => {
      expect(preparedRate(15, null)).toBe(15);
      expect(preparedRate(15, 21)).toBe(15);
      expect(preparedRate(15, null, 3)).toBe(15);
    });

    it("is 0 without POW", () => {
      expect(preparedRate(null, 21)).toBe(0);
    });
  });
});
