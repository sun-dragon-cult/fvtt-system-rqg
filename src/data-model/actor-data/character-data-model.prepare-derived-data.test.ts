import { describe, expect, it } from "vitest";
import { CharacterDataModel } from "./character-data-model";
import { getCharacteristicDerivedValues } from "./derived-character-values";
import { RqgCalculations } from "../../system/rqg-calculations";

function buildSystem() {
  return {
    characteristics: {
      strength: { value: 13 },
      constitution: { value: 11 },
      size: { value: 13 },
      dexterity: { value: 15 },
      intelligence: { value: 12 },
      power: { value: 15 },
      charisma: { value: 11 },
    },
    attributes: {
      isCreature: false,
      magicPoints: { max: 0 },
      hitPoints: { max: 0 },
    },
    effect: {
      add: {
        magicPoints: { max: 0 },
        hitPoints: { max: 0 },
        skillCategoryModifiers: {
          agility: 0,
          communication: 0,
          knowledge: 0,
          magic: 0,
          manipulation: 0,
          perception: 0,
          stealth: 0,
          meleeWeapons: 0,
          missileWeapons: 0,
          shields: 0,
          naturalWeapons: 0,
          otherSkills: 0,
        },
      },
    },
    baseSkillCategoryModifiers: {
      agility: 0,
      communication: 0,
      knowledge: 0,
      magic: 0,
      manipulation: 0,
      perception: 0,
      stealth: 0,
      meleeWeapons: 0,
      missileWeapons: 0,
      shields: 0,
      naturalWeapons: 0,
      otherSkills: 0,
    },
    skillCategoryModifiers: {
      agility: 0,
      communication: 0,
      knowledge: 0,
      magic: 0,
      manipulation: 0,
      perception: 0,
      stealth: 0,
      meleeWeapons: 0,
      missileWeapons: 0,
      shields: 0,
      naturalWeapons: 0,
      otherSkills: 0,
    },
  };
}

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
});
