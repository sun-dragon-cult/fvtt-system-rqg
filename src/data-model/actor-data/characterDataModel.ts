import { RqgActorDataModel } from "./RqgActorDataModel";
import { rqidLinkSchemaField, rqidLinkArraySchemaField } from "../shared/rqidLinkField";
import { resourceSchemaField } from "../shared/resourceSchemaField";
import { actorHealthStatuses, LocomotionEnum } from "./attributes";
import { enumChoices } from "../shared/enumChoices";
import type { SkillCategories } from "./skillCategories";
import { getCharacteristicDerivedValues } from "./derivedCharacterValues";
import type { CharacterActor } from "./rqgActorData";
import { RqgCalculations } from "../../system/rqgCalculations";

const { BooleanField, NumberField, SchemaField, StringField } = foundry.data.fields;

function characteristicSchemaField(formula: string) {
  return new SchemaField({
    value: new NumberField({ integer: true, nullable: true, initial: 0 }),
    formula: new StringField({ blank: true, nullable: true, initial: formula }),
    hasExperience: new BooleanField({ nullable: true, initial: undefined }),
  });
}

function locomotionSchemaField(
  initialValue: number | undefined,
  initialCarrying: number | undefined,
) {
  return new SchemaField({
    value: new NumberField({ nullable: true, initial: initialValue }),
    carryingFactor: new NumberField({ nullable: true, initial: initialCarrying }),
  });
}

type CharacterSchema = ReturnType<typeof CharacterDataModel.defineSchema>;

export class CharacterDataModel extends RqgActorDataModel<
  CharacterSchema,
  {
    skillCategoryModifiers: SkillCategories;
    baseSkillCategoryModifiers: SkillCategories;
  }
> {
  static override defineSchema() {
    return {
      characteristics: new SchemaField({
        strength: characteristicSchemaField("3d6"),
        constitution: characteristicSchemaField("3d6"),
        size: characteristicSchemaField("2d6+6"),
        dexterity: characteristicSchemaField("3d6"),
        intelligence: characteristicSchemaField("2d6+6"),
        power: characteristicSchemaField("3d6"),
        charisma: characteristicSchemaField("3d6"),
      }),

      background: new SchemaField({
        species: new StringField({ blank: true, nullable: false, initial: "Human" }),
        speciesRqidLink: rqidLinkSchemaField({ nullable: true }),
        occupation: new StringField({ blank: true, nullable: false, initial: "" }),
        currentOccupationRqidLink: rqidLinkSchemaField({ nullable: true }),
        homeland: new StringField({ blank: true, nullable: true, initial: undefined }),
        town: new StringField({ blank: true, nullable: true, initial: undefined }),
        birthYear: new NumberField({ nullable: true, initial: undefined }),
        age: new NumberField({ nullable: true, initial: undefined }),
        gender: new StringField({ blank: true, nullable: true, initial: undefined }),
        tribe: new StringField({ blank: true, nullable: true, initial: undefined }),
        clan: new StringField({ blank: true, nullable: true, initial: undefined }),
        reputation: new NumberField({ nullable: true, initial: undefined }),
        standardOfLiving: new StringField({ blank: true, nullable: true, initial: undefined }),
        ransom: new NumberField({ nullable: true, initial: undefined }),
        ransomDetails: new StringField({ blank: true, nullable: true, initial: undefined }),
        baseIncome: new NumberField({ nullable: true, initial: undefined }),
        biography: new StringField({ blank: true, nullable: true, initial: undefined }),
        homelandJournalRqidLink: rqidLinkSchemaField({ nullable: true }),
        regionJournalRqidLink: rqidLinkSchemaField({ nullable: true }),
        cultureJournalRqidLinks: rqidLinkArraySchemaField(),
        tribeJournalRqidLinks: rqidLinkArraySchemaField(),
        clanJournalRqidLinks: rqidLinkArraySchemaField(),
      }),

      allies: new StringField({ blank: true, nullable: false, initial: "" }),
      editMode: new BooleanField({ nullable: false, initial: true }),
      extendedName: new StringField({ blank: true, nullable: false, initial: "" }),

      attributes: new SchemaField({
        magicPoints: resourceSchemaField(),
        hitPoints: resourceSchemaField(),
        move: new SchemaField({
          currentLocomotion: new StringField({
            blank: false,
            nullable: false,
            initial: LocomotionEnum.Walk,
            choices: enumChoices(LocomotionEnum, "RQG.Actor.Attributes.MoveMode."),
          }),
          [LocomotionEnum.Walk]: locomotionSchemaField(8, 1),
          [LocomotionEnum.Swim]: locomotionSchemaField(2, 0.5),
          [LocomotionEnum.Fly]: locomotionSchemaField(undefined, undefined),
        }),
        heroPoints: new NumberField({ integer: true, min: 0, nullable: false, initial: 0 }),
        isCreature: new BooleanField({ nullable: false, initial: false }),
        health: new StringField({
          blank: false,
          nullable: false,
          initial: "healthy",
          choices: enumChoices(actorHealthStatuses, "RQG.Actor.Attributes.Health."),
        }),
        magicPointsMaxFromEffects: new NumberField({
          integer: true,
          nullable: false,
          initial: 0,
          persisted: false,
        }),
        hitPointsMaxFromEffects: new NumberField({
          integer: true,
          nullable: false,
          initial: 0,
          persisted: false,
        }),
        skillCategoryModifiersFromEffects: new SchemaField({
          agility: new NumberField({
            integer: true,
            nullable: false,
            initial: 0,
            persisted: false,
          }),
          communication: new NumberField({
            integer: true,
            nullable: false,
            initial: 0,
            persisted: false,
          }),
          knowledge: new NumberField({
            integer: true,
            nullable: false,
            initial: 0,
            persisted: false,
          }),
          magic: new NumberField({ integer: true, nullable: false, initial: 0, persisted: false }),
          manipulation: new NumberField({
            integer: true,
            nullable: false,
            initial: 0,
            persisted: false,
          }),
          perception: new NumberField({
            integer: true,
            nullable: false,
            initial: 0,
            persisted: false,
          }),
          stealth: new NumberField({
            integer: true,
            nullable: false,
            initial: 0,
            persisted: false,
          }),
          meleeWeapons: new NumberField({
            integer: true,
            nullable: false,
            initial: 0,
            persisted: false,
          }),
          missileWeapons: new NumberField({
            integer: true,
            nullable: false,
            initial: 0,
            persisted: false,
          }),
          shields: new NumberField({
            integer: true,
            nullable: false,
            initial: 0,
            persisted: false,
          }),
          naturalWeapons: new NumberField({
            integer: true,
            nullable: false,
            initial: 0,
            persisted: false,
          }),
          otherSkills: new NumberField({
            integer: true,
            nullable: false,
            initial: 0,
            persisted: false,
          }),
        }),
      }),
    } as const;
  }

  override prepareDerivedData(): void {
    super.prepareDerivedData();

    const system = this as unknown as CharacterActor["system"];
    const characteristics = system.characteristics;

    const characteristicDerived = getCharacteristicDerivedValues({
      str: characteristics.strength.value,
      con: characteristics.constitution.value,
      siz: characteristics.size.value,
      dex: characteristics.dexterity.value,
      int: characteristics.intelligence.value,
      pow: characteristics.power.value,
      cha: characteristics.charisma.value,
      isCreature: system.attributes.isCreature,
    });

    system.baseSkillCategoryModifiers = characteristicDerived.skillCategoryModifiers;

    // Compose skill modifiers: base + effects + encumbrance penalties
    const effectsModifiers = system.attributes.skillCategoryModifiersFromEffects ?? {
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
    };

    const baseWithEffects = {
      agility: characteristicDerived.skillCategoryModifiers.agility + effectsModifiers.agility,
      communication:
        characteristicDerived.skillCategoryModifiers.communication + effectsModifiers.communication,
      knowledge:
        characteristicDerived.skillCategoryModifiers.knowledge + effectsModifiers.knowledge,
      magic: characteristicDerived.skillCategoryModifiers.magic + effectsModifiers.magic,
      manipulation:
        characteristicDerived.skillCategoryModifiers.manipulation + effectsModifiers.manipulation,
      perception:
        characteristicDerived.skillCategoryModifiers.perception + effectsModifiers.perception,
      stealth: characteristicDerived.skillCategoryModifiers.stealth + effectsModifiers.stealth,
      meleeWeapons:
        characteristicDerived.skillCategoryModifiers.meleeWeapons + effectsModifiers.meleeWeapons,
      missileWeapons:
        characteristicDerived.skillCategoryModifiers.missileWeapons +
        effectsModifiers.missileWeapons,
      shields: characteristicDerived.skillCategoryModifiers.shields + effectsModifiers.shields,
      naturalWeapons:
        characteristicDerived.skillCategoryModifiers.naturalWeapons +
        effectsModifiers.naturalWeapons,
      otherSkills:
        characteristicDerived.skillCategoryModifiers.otherSkills + effectsModifiers.otherSkills,
    };

    system.skillCategoryModifiers = baseWithEffects;

    system.attributes.dexStrikeRank = characteristicDerived.dexStrikeRank;
    system.attributes.sizStrikeRank = characteristicDerived.sizStrikeRank;
    system.attributes.damageBonus = characteristicDerived.damageBonus;
    system.attributes.healingRate = characteristicDerived.healingRate;
    system.attributes.spiritCombatDamage = characteristicDerived.spiritCombatDamage;

    // Calculate resource max values with effects deltas
    const { con, siz, pow } = {
      con: characteristics.constitution.value,
      siz: characteristics.size.value,
      pow: characteristics.power.value,
    };

    // Note: Non-persisted fields are used to allow AE to target these values
    // (Requires Foundry v14+)
    const systemAny = system as any;
    if (systemAny.attributes.magicPoints) {
      const magicPointsFromEffects = (systemAny.attributes.magicPointsMaxFromEffects ??
        0) as number;
      systemAny.attributes.magicPoints.max = (pow ?? 0) + magicPointsFromEffects;
    }
    if (systemAny.attributes.hitPoints) {
      const hitPointsFromEffects = (systemAny.attributes.hitPointsMaxFromEffects ?? 0) as number;
      const baseHitPoints = RqgCalculations.hitPoints(con ?? 0, siz ?? 0, pow ?? 0) ?? 0;
      systemAny.attributes.hitPoints.max = baseHitPoints + hitPointsFromEffects;
    }
  }
}
