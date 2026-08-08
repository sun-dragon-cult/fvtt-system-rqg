import { type AbilityItem, ItemTypeEnum } from "@item-model/item-types.ts";
import type { IAbility } from "../../data-model/shared/ability";
import type { RqgItem } from "../../items/rqg-item";
import {
  assertDocumentSubType,
  isDocumentSubType,
  localize,
  localizeItemType,
  toSignedString,
} from "../../system/util";
import { ActorTypeEnum, type CharacterActor } from "../../data-model/actor-data/rqg-actor-data.ts";
import { getCharacteristicDerivedValues } from "../../data-model/actor-data/derived-character-values";
import type { PassionItem } from "@item-model/passion-data-model.ts";
import type { RuneItem } from "@item-model/rune-data-model.ts";
import type { SkillItem } from "@item-model/skill-data-model.ts";
import { RqgLogger } from "../../system/logging/rqg-logger";
import {
  getImprovementSourceFromGainType,
  type ImprovementDetailRow,
  type ImprovementRequest,
  type ImprovementSource,
} from "./improvement-roll.types";

const logger = new RqgLogger("ability-improvement-adapter");

const SUPPORTED_ABILITY_GAIN_TYPES = [
  "experience-gain-fixed",
  "experience-gain-random",
  "research-gain-fixed",
  "research-gain-random",
  "training-gain-fixed",
  "training-gain-random",
] as const;

export type AbilityGainType = (typeof SUPPORTED_ABILITY_GAIN_TYPES)[number];

export type AbilityType = "passion" | "skill" | "rune";

export type AbilityImprovementSource = ImprovementSource;

export type AbilityImprovementData = {
  abilityType: AbilityType;
  typeLocName: string; // Translated item type
  name: string; // name of item
  currentValueDisplay: string;
  showExperience: boolean;
  showResearch: boolean;
  showTraining: boolean;
  canExperience: boolean;
  canGetExperience: boolean;
  canResearch: boolean;
  canTraining: boolean;
  img: string | null;
  skillChance?: number;
  requiredRoll?: number;
  categoryModDisplay?: string;
  chance: number;
  chanceToGain: number;
  categoryMod?: number;
  skillOver75?: boolean;
  atRuneCap?: boolean;
  experienceGainFixed: number;
  experienceGainRandom: string;
  researchGainFixed: number;
  researchGainRandom: string;
  trainingGainFixed: number;
  trainingGainRandom: string;
};

export function isSupportedAbilityGainType(gainType: string): gainType is AbilityGainType {
  return (SUPPORTED_ABILITY_GAIN_TYPES as readonly string[]).includes(gainType);
}

/**
 * Maps a chosen gain type onto the shared improvement contract.
 *
 * Ability improvements are roll-over: Experience and Research only gain when the roll beats the
 * ability's own value (Core p.415-417), while Training gains without any roll at all.
 */
export function buildAbilityImprovementRequest(
  improvementData: AbilityImprovementData,
  gainType: AbilityGainType,
  actorName: string,
  speaker: ChatMessage.SpeakerData,
): ImprovementRequest {
  const source = getImprovementSourceFromGainType(gainType);
  const isFixed = gainType.endsWith("-fixed");

  return {
    domain: "ability",
    source,
    name: improvementData.name,
    typeLocName: improvementData.typeLocName,
    img: improvementData.img,
    actorName,
    currentValue: improvementData.chance,
    valueSuffix: "%",
    gate: source === "training" ? undefined : buildAbilityGate(improvementData),
    gain: {
      kind: isFixed ? "fixed" : "random",
      formula: String(getGainFormula(improvementData, source, isFixed)),
    },
    // Runes cannot normally increase over 100% (Core p.415) - Skills and Passions have no such cap.
    maxValue: improvementData.abilityType === "rune" ? 100 : undefined,
    gateBreakdownChips: source === "training" ? [] : buildAbilityGateBreakdown(improvementData),
    speaker,
  };
}

/**
 * The Experience/Research gate. The category modifier is folded into the threshold (skill value
 * minus modifier) rather than into the roll, so the displayed roll always stays a plain 1-100
 * value - matching every other roll card in the app - instead of showing a total above 100 when
 * die+modifier is displayed as the roll.
 *
 * The base value is capped at 99 before the modifier is subtracted: the underlying rule is a
 * *modified* roll of 100+ always succeeds (`RQG.Dialog...modifiedHundredAlwaysLabel`, and
 * `updateAdapterForSkill`'s own probability calc counts `modifiedRoll >= 100`). For an
 * (already rare) skill whose *unmodified* value is itself >=100% with a positive category mod,
 * leaving the base uncapped would silently drop that "modified 100+" success band, since a raw
 * roll can never itself exceed 100. Capping at 99 reproduces the modified-100+ rule exactly via
 * the plain roll-over comparison; the natural-100 exception below covers the mirror case (a
 * heavily negative modifier pushing the threshold past 100).
 *
 * The natural-100 exception applies to every ability type, not just skills: Runes and Passions
 * take no category modifier, so their roll is already a plain, unmodified 1d100, and a natural
 * 100 there must still succeed even once their value reaches or passes 100% (Passions routinely
 * do) - otherwise they'd become permanently un-improvable via Experience/Research.
 */
function buildAbilityGate(improvementData: AbilityImprovementData) {
  const categoryMod = improvementData.categoryMod ?? 0;
  return {
    formula: "1d100",
    comparator: "roll-over" as const,
    threshold: Math.min(getGateThreshold(improvementData), 99) - categoryMod,
    naturalHundredAlwaysSucceeds: true,
  };
}

function getGainFormula(
  improvementData: AbilityImprovementData,
  source: AbilityImprovementSource,
  isFixed: boolean,
): number | string {
  switch (source) {
    case "experience":
      return isFixed ? improvementData.experienceGainFixed : improvementData.experienceGainRandom;
    case "research":
      return isFixed ? improvementData.researchGainFixed : improvementData.researchGainRandom;
    case "training":
      return isFixed ? improvementData.trainingGainFixed : improvementData.trainingGainRandom;
  }
}

/**
 * Explains what the gate's threshold represents: always at least the ability's own value (so the
 * headline target is never a bare unlabeled number), plus the category modifier adjustment for
 * skills that have one. Runes and Passions take no category modifier (Core p.415-416), so their
 * threshold is always just that base value.
 */
function buildAbilityGateBreakdown(
  improvementData: AbilityImprovementData,
): ImprovementDetailRow[] {
  const isSkill = improvementData.abilityType === "skill";
  const baseLabel = isSkill
    ? localize("RQG.Dialog.improveAbilityDialog.skillValueLabel")
    : improvementData.typeLocName;
  // Capped the same way as buildAbilityGate's base term, so these chips always sum to the
  // threshold actually shown in the headline instead of a stale pre-cap number.
  const baseValue = Math.min(getGateThreshold(improvementData), 99);
  const chips: ImprovementDetailRow[] = [{ label: baseLabel, value: String(baseValue) }];

  const categoryMod = improvementData.categoryMod ?? 0;
  if (isSkill && categoryMod !== 0) {
    chips.push(
      { label: "", value: categoryMod > 0 ? "−" : "+" },
      {
        label: localize("RQG.Dialog.improveAbilityDialog.categoryModifierLabel"),
        value: String(Math.abs(categoryMod)),
      },
    );
  }

  return chips;
}

export function formatCategoryModDisplay(categoryMod: number): string {
  return toSignedString(categoryMod);
}

/**
 * The Experience/Research gate's baseline: the *unmodified* skill value for skills (the category
 * modifier is subtracted from this separately when building the gate's threshold - see
 * {@link buildAbilityGate}), or the plain chance for Runes/Passions (Core p.415-416: they get no
 * category modifier).
 */
export function getGateThreshold(improvementData: AbilityImprovementData): number {
  return improvementData.abilityType === "skill"
    ? Number(improvementData.skillChance ?? 0)
    : Number(improvementData.chance);
}

export function getDefaultAbilityImprovementSource(
  improvementData: AbilityImprovementData,
): AbilityImprovementSource | null {
  if (improvementData.canExperience) {
    return "experience";
  }
  if (improvementData.canResearch) {
    return "research";
  }
  if (improvementData.canTraining) {
    return "training";
  }
  return null;
}

/** Builds the dialog/roll data model for a Passion, Rune, or Skill item. */
export function buildAbilityImprovementData(item: AbilityItem): AbilityImprovementData {
  const sourceAbility = item._source.system as Partial<IAbility>;
  const sourceChance = Number(sourceAbility.chance ?? 0);

  const improvementData: AbilityImprovementData = {
    name: item.name ?? "",
    typeLocName: localizeItemType(item.type),
    abilityType: getAbilityType(item),
    currentValueDisplay: "",
    showExperience: Boolean(sourceAbility.hasExperience),
    showResearch: true,
    showTraining: true,
    canExperience: Boolean(sourceAbility.hasExperience),
    canGetExperience: Boolean(sourceAbility.canGetExperience),
    canResearch: true,
    canTraining: true,
    img: item.img,
    chance: sourceChance,
    chanceToGain: Math.max(100 - sourceChance, 1),
    requiredRoll: Math.min(Math.max(Math.floor(sourceChance) + 1, 1), 100),
    experienceGainFixed: 3,
    experienceGainRandom: "1d6",
    researchGainFixed: 1,
    researchGainRandom: "1d6-2",
    trainingGainFixed: 2,
    trainingGainRandom: "1d6-1",
  };

  configureAdapterForAbilityItem(improvementData, item);

  improvementData.currentValueDisplay = `${improvementData.chance}%`;
  return improvementData;
}

function getAbilityType(item: RqgItem): AbilityType {
  if (isDocumentSubType<SkillItem>(item, ItemTypeEnum.Skill)) {
    return "skill";
  }
  if (isDocumentSubType<PassionItem>(item, ItemTypeEnum.Passion)) {
    return "passion";
  }
  if (isDocumentSubType<RuneItem>(item, ItemTypeEnum.Rune)) {
    return "rune";
  }
  return logger.throw("Expected ability item type (skill, passion, or rune)", item);
}

export function updateAdapterForSkill(
  improvementData: AbilityImprovementData,
  item: RqgItem,
): void {
  assertDocumentSubType<SkillItem>(item, ItemTypeEnum.Skill);
  improvementData.abilityType = "skill";
  const actor = item.parent;
  if (!actor) {
    return logger.throw("Tried to improve a skill item that isn't embedded on an actor", item);
  }
  assertDocumentSubType<CharacterActor>(actor, ActorTypeEnum.Character);

  // Use unmodified values for improvement checks: base category modifier and source skill value.
  // Derived from the actor's *source* characteristics rather than actor.system.baseSkillCategoryModifiers,
  // since active effects on characteristics (e.g. status-effect conditions) are already baked into the
  // live/prepared characteristic values and must not influence this gate roll.
  const sourceCharacteristics = actor._source.system.characteristics;
  const sourceCategoryModifiers = getCharacteristicDerivedValues({
    str: sourceCharacteristics.strength.value,
    con: sourceCharacteristics.constitution.value,
    siz: sourceCharacteristics.size.value,
    dex: sourceCharacteristics.dexterity.value,
    int: sourceCharacteristics.intelligence.value,
    pow: sourceCharacteristics.power.value,
    cha: sourceCharacteristics.charisma.value,
    isCreature: actor._source.system.attributes.isCreature,
  }).skillCategoryModifiers;
  improvementData.categoryMod = Number(sourceCategoryModifiers[item.system.category] ?? 0);
  improvementData.categoryModDisplay = formatCategoryModDisplay(improvementData.categoryMod);
  const unmodifiedSkillChance =
    Number(item._source.system.baseChance) + Number(item._source.system.gainedChance);
  improvementData.skillChance = unmodifiedSkillChance;
  improvementData.chance = improvementData.categoryMod + unmodifiedSkillChance;
  const skillChance = unmodifiedSkillChance;
  const categoryMod = Number(improvementData.categoryMod);
  const successfulRawRolls = Array.from({ length: 100 }, (_, i) => i + 1).filter((rawRoll) => {
    const modifiedRoll = rawRoll + categoryMod;
    return modifiedRoll > skillChance || modifiedRoll >= 100 || rawRoll >= 100;
  });
  improvementData.chanceToGain = successfulRawRolls.length;
  improvementData.requiredRoll = successfulRawRolls[0] ?? 100;

  applyOver75TrainingResearchGate(improvementData);
}

/**
 * Abilities at 75%+ with canGetExperience (Core p.415's box, not the hasExperience tick)
 * must be improved through Experience instead of Training/Research (Core p.416, p.417). Applies to
 * Skills and Runes alike; never called for Passions, which are always fully excluded.
 */
function applyOver75TrainingResearchGate(improvementData: AbilityImprovementData): void {
  if (improvementData.chance >= 75 && improvementData.canGetExperience) {
    improvementData.canTraining = false;
    improvementData.canResearch = false;
    improvementData.skillOver75 = true;
  }
}

/**
 * Runes cannot normally increase over 100% (Core p.415).
 */
function applyRuneHundredPercentCap(improvementData: AbilityImprovementData): void {
  if (improvementData.chance >= 100) {
    improvementData.canExperience = false;
    improvementData.canResearch = false;
    improvementData.canTraining = false;
    improvementData.atRuneCap = true;
  }
}

export function configureAdapterForAbilityItem(
  improvementData: AbilityImprovementData,
  item: RqgItem,
): void {
  if (isDocumentSubType<SkillItem>(item, ItemTypeEnum.Skill)) {
    updateAdapterForSkill(improvementData, item);
    return;
  }

  if (isDocumentSubType<PassionItem>(item, ItemTypeEnum.Passion)) {
    improvementData.abilityType = "passion";
    // Cannot train or research passions (Core p.417: research is only for skills/Runes)
    improvementData.showTraining = false;
    improvementData.canTraining = false;
    improvementData.showResearch = false;
    improvementData.canResearch = false;
    return;
  }

  if (isDocumentSubType<RuneItem>(item, ItemTypeEnum.Rune)) {
    improvementData.abilityType = "rune";
    improvementData.name = item.system.rune;
    applyOver75TrainingResearchGate(improvementData);
    applyRuneHundredPercentCap(improvementData);
    return;
  }

  logger.throw(
    "Call to submitImproveAbilityDialog with item that was not a Passion, Rune, or Skill",
    item,
  );
}
