import { RqgActorDataModel } from "./rqg-actor-data-model";
import { rqidLinkSchemaField, rqidLinkArraySchemaField } from "../shared/rqid-link-field";
import { derivedResourceSchemaField } from "../shared/resource-schema-field";
import { actorHealthStatuses, LocomotionEnum } from "./attributes";
import { OccupationEnum } from "./background-enums";
import { enumChoices } from "../shared/enum-choices";
import type { SkillCategories } from "./skill-categories";
import { getCharacteristicDerivedValues } from "./derived-character-values";
import type { CharacterActor } from "./rqg-actor-data";
import { RqgCalculations } from "../../system/rqg-calculations";
import { ItemTypeEnum } from "../item-data/item-types";
import type { SpiritMagicItem } from "../item-data/spirit-magic-data-model";
import type { SkillItem } from "../item-data/skill-data-model";
import type { CultItem } from "../item-data/cult-data-model";
import {
  compareCultsByPriority,
  hasGodTalkerOrHigherNonRuneLord,
} from "../item-data/cult-priority";
import { isDocumentSubType } from "../../system/util";

const { BooleanField, DocumentUUIDField, NumberField, SchemaField, StringField } =
  foundry.data.fields;

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

function defineCharacterSchema() {
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
      occupation: new StringField({
        blank: true,
        nullable: false,
        initial: OccupationEnum.NoOccupation,
        choices: enumChoices(
          OccupationEnum,
          (o: OccupationEnum) => `RQG.Actor.Background.Occupation.${o || "none"}`,
        ),
      }),
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

    /** The Character actor playing this actor's Allied Spirit (Core p.277, #957) - a bonded
     *  ally sharing Magic Points and Rune Points bidirectionally. Cardinality of one per
     *  priest is not enforced by code (GM-adjudicated, per the rule). */
    alliedSpiritActorUuid: new DocumentUUIDField({
      blank: false,
      nullable: true,
      initial: undefined,
      required: false,
    }),

    attributes: new SchemaField({
      magicPoints: derivedResourceSchemaField(),
      /** 1 = RAW baseline (1 point/24h, p.54); 2 = twice as fast, 0.5 = half as fast.
       *  Lets Humakti gifts / HeroQuest effects speed up or slow down recovery (#512). */
      magicPointRecoveryRateFactor: new NumberField({ nullable: false, initial: 1, min: 0 }),
      /** `game.time.worldTime` (seconds) as of the last passive-recovery catch-up (#1028).
       *  `null` means "never settled yet" - distinct from a real timestamp of 0 - so the first
       *  catch-up for a pre-existing actor can seed it to "now" instead of granting retroactive
       *  recovery for all elapsed time before the field existed. */
      magicPointRecoverySettledWorldTime: new NumberField({
        nullable: true,
        initial: null,
        required: false,
      }),
      hitPoints: derivedResourceSchemaField(),
      /** `game.time.worldTime` (seconds) as of the last natural-healing catch-up (#436, following
       *  #1028's pattern). `null` means "never settled yet", so the first catch-up for a
       *  pre-existing actor seeds it to "now" instead of granting retroactive healing for all
       *  elapsed time before the field existed. */
      healingSettledWorldTime: new NumberField({
        nullable: true,
        initial: null,
        required: false,
      }),
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
    }),

    effect: new SchemaField({
      add: new SchemaField({
        magicPoints: new SchemaField({
          max: new NumberField({ integer: true, nullable: false, initial: 0, persisted: false }),
        }),
        hitPoints: new SchemaField({
          max: new NumberField({ integer: true, nullable: false, initial: 0, persisted: false }),
        }),
        skillCategoryModifiers: new SchemaField({
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
    }),
  } as const;
}

type CharacterSchema = ReturnType<typeof defineCharacterSchema>;

export class CharacterDataModel extends RqgActorDataModel<
  CharacterSchema,
  {
    skillCategoryModifiers: SkillCategories;
    baseSkillCategoryModifiers: SkillCategories;
  }
> {
  static override defineSchema() {
    return defineCharacterSchema();
  }

  static getSpiritMagicPointSum(actor: CharacterActor): number {
    return actor.items.reduce((acc: number, item) => {
      if (
        isDocumentSubType<SpiritMagicItem>(item, ItemTypeEnum.SpiritMagic) &&
        !item.system.isMatrix
      ) {
        return acc + item.system.points;
      }
      return acc;
    }, 0);
  }

  static getSorcerySkillCount(actor: CharacterActor): number {
    return actor.items.filter(
      (i) =>
        isDocumentSubType<SkillItem>(i, ItemTypeEnum.Skill) && !!i.system.runeRqidLinks?.length,
    ).length;
  }

  static getFreeInt(actor: CharacterActor, spiritMagicPointSum: number): number {
    const sorcerySkillCount = CharacterDataModel.getSorcerySkillCount(actor);

    return (
      (actor.system.characteristics.intelligence.value ?? 0) -
      spiritMagicPointSum -
      sorcerySkillCount
    );
  }

  /** RAW cap on bound spirits (#999, RQG p.250) - CHA÷3, GM-adjudicated, not enforced. */
  static getBoundSpiritCap(actor: CharacterActor): number {
    return Math.floor((actor.system.characteristics.charisma.value ?? 0) / 3);
  }

  static getSortedCults(actor: CharacterActor): CultItem[] {
    return actor.items
      .filter((i) => isDocumentSubType<CultItem>(i, ItemTypeEnum.Cult))
      .sort((a, b) => compareCultsByPriority(a as CultItem, b as CultItem)) as CultItem[];
  }

  static getMainCult(actor: CharacterActor): CultItem | undefined {
    return CharacterDataModel.getSortedCults(actor)[0];
  }

  /**
   * Whether this actor has been granted the "Embrace Runic Opposites" power: opposed
   * Power/Form runes no longer need to sum to 100% (Cults of RuneQuest: The Lunar Way,
   * p.96). This is one of several distinct powers a gamemaster may grant an Illuminate —
   * it is common but not automatic.
   *
   * Disabled for now (always false): there's no supported way yet for a player to be
   * granted this power. Tracking it properly needs a dedicated `illuminationPower` item
   * type (see #975) rather than reusing a Rune item as an ad-hoc marker.
   */
  static hasEmbraceRunicOpposites(_actor: CharacterActor): boolean {
    return false;
  }

  static getPowWarning(actor: CharacterActor): boolean {
    const hasHighRank = actor.items
      .filter((i) => isDocumentSubType<CultItem>(i, ItemTypeEnum.Cult))
      .some((cult) => hasGodTalkerOrHigherNonRuneLord(cult));

    if (!hasHighRank) {
      return false;
    }

    return (actor.system.characteristics.power.value ?? 0) < 18;
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

    // Non-persisted fields are reinitialized each prepare cycle by Foundry v14.
    // Keep composition strict here so schema regressions are visible in tests.
    const effectsModifiers = system.effect.add.skillCategoryModifiers;

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

    // ActiveEffect deltas are accumulated in non-persisted fields that Foundry
    // reinitializes per cycle before effects are applied.
    if (system.attributes.magicPoints) {
      const magicPointsFromEffects = system.effect.add.magicPoints.max ?? 0;
      system.attributes.magicPoints.max = (pow ?? 0) + magicPointsFromEffects;
      system.attributes.magicPointRecoveryPointsPerDay =
        RqgCalculations.magicPointRecoveryPointsPerDay(
          system.attributes.magicPoints.max,
          system.attributes.magicPointRecoveryRateFactor,
        );
      const timePerPoint = RqgCalculations.magicPointRecoveryTimePerPoint(
        system.attributes.magicPoints.max,
        system.attributes.magicPointRecoveryRateFactor,
      );
      system.attributes.magicPointRecoveryHoursPerPoint = timePerPoint.hours;
      system.attributes.magicPointRecoveryMinutesPerPoint = timePerPoint.minutes;
    }
    if (system.attributes.hitPoints) {
      const hitPointsFromEffects = system.effect.add.hitPoints.max ?? 0;
      const baseHitPoints = RqgCalculations.hitPoints(con ?? 0, siz ?? 0, pow ?? 0) ?? 0;
      system.attributes.hitPoints.max = baseHitPoints + hitPointsFromEffects;
    }
  }
}
