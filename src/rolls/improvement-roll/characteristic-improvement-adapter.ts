import type { RqgActor } from "../../actors/rqg-actor";
import { isDocumentSubType, localize } from "../../system/util";
import { ItemTypeEnum } from "@item-model/item-types.ts";
import type { CultItem } from "@item-model/cult-data-model.ts";
import { CultRankEnum } from "@item-model/cult-enums.ts";
import type { Characteristics } from "../../data-model/actor-data/characteristics";
import { RqgLogger } from "../../system/logging/rqg-logger";
import {
  getImprovementSourceFromGainType,
  type ImprovementDetailRow,
  type ImprovementRequest,
  type ImprovementSource,
} from "./improvement-roll.types";

const logger = new RqgLogger("characteristic-improvement-adapter");

const SUPPORTED_CHARACTERISTIC_GAIN_TYPES = [
  "experience-gain-fixed",
  "experience-gain-random",
  "training-gain-random",
  "research-gain-random",
] as const;

export type CharacteristicGainType = (typeof SUPPORTED_CHARACTERISTIC_GAIN_TYPES)[number];

export type CharacteristicImprovementSource = ImprovementSource;

type SourceCharacteristic = {
  name: keyof Characteristics;
  value: number;
  formula: string;
  hasExperience?: boolean | null;
};

export type CharacteristicImprovementData = {
  shortName: string;
  name: string;
  typeLocName: string;
  currentValueDisplay: string;
  hasExperience: boolean;
  cultBonusValue: number;
  cultBonusLabel: string;
  canExperience: boolean;
  canTraining: boolean;
  canResearch: boolean;
  showExperience: boolean;
  showTraining: boolean;
  showResearch: boolean;
  atSpeciesMax?: boolean;
  chance: number;
  chanceToGain: number;
  speciesMax: number;
  experienceGainFixed: number;
  experienceGainRandom: string;
  trainingGainRandom: string;
  researchGainRandom: string;
  /** POW training requires the same gated POW-gain-roll chance check as Experience; other trainable characteristics don't. */
  trainingIsGated: boolean;
};

export function isSupportedCharacteristicGainType(
  gainType: string,
): gainType is CharacteristicGainType {
  return (SUPPORTED_CHARACTERISTIC_GAIN_TYPES as readonly string[]).includes(gainType);
}

/**
 * Maps a chosen gain type onto the shared improvement contract.
 *
 * Characteristic improvements are roll-under: the POW-gain-roll style check gains when the roll
 * lands at or below the improvement chance (Core p.418). Training only takes that check for POW;
 * the other trainable characteristics gain without a roll.
 */
export function buildCharacteristicImprovementRequest(
  improvementData: CharacteristicImprovementData,
  gainType: CharacteristicGainType,
  actorName: string,
  speaker: ChatMessage.SpeakerData,
): ImprovementRequest {
  const source = getImprovementSourceFromGainType(gainType);
  const isFixed = gainType.endsWith("-fixed");
  const isGated = source !== "training" || improvementData.trainingIsGated;

  return {
    domain: "characteristic",
    source,
    name: improvementData.name,
    typeLocName: improvementData.typeLocName,
    actorName,
    currentValue: improvementData.chance,
    valueSuffix: "",
    gate: isGated
      ? {
          formula: "1d100",
          comparator: "roll-under" as const,
          threshold: improvementData.chanceToGain,
        }
      : undefined,
    gain: {
      kind: isFixed ? "fixed" : "random",
      formula: String(getGainFormula(improvementData, source, isFixed)),
    },
    gateBreakdownChips: buildCharacteristicGateBreakdown(improvementData, isGated),
    speaker,
  };
}

function getGainFormula(
  improvementData: CharacteristicImprovementData,
  source: CharacteristicImprovementSource,
  isFixed: boolean,
): number | string {
  switch (source) {
    case "experience":
      return isFixed ? improvementData.experienceGainFixed : improvementData.experienceGainRandom;
    case "research":
      return improvementData.researchGainRandom;
    case "training":
      return improvementData.trainingGainRandom;
  }
}

/**
 * Explains the roll-under threshold (chanceToGain) as the same formula the dialog shows:
 * (species max - current value) x 5 [+ cult standing bonus]. The current value has to be part of
 * the chain even though it isn't shown elsewhere in the card, since without it the chips wouldn't
 * actually add up to chanceToGain - e.g. "21 Species Max" and "+20 High Priest" alone read as
 * 21+20=41, not the real (21-18)x5+20=35.
 */
function buildCharacteristicGateBreakdown(
  improvementData: CharacteristicImprovementData,
  isGated: boolean,
): ImprovementDetailRow[] {
  if (!isGated) {
    return [];
  }

  const chips: ImprovementDetailRow[] = [
    { label: "", value: "(" },
    {
      label: localize("RQG.Dialog.improveAbilityDialog.speciesMaxLabel"),
      value: String(improvementData.speciesMax),
    },
    { label: "", value: "−" },
    { label: improvementData.shortName, value: String(improvementData.chance) },
    { label: "", value: ") × 5" },
  ];

  if (improvementData.cultBonusValue) {
    chips.push(
      { label: "", value: "+" },
      { label: improvementData.cultBonusLabel, value: String(improvementData.cultBonusValue) },
    );
  }

  return chips;
}

export function getDefaultCharacteristicImprovementSource(
  improvementData: CharacteristicImprovementData,
): CharacteristicImprovementSource | null {
  if (improvementData.canResearch) {
    return "research";
  }
  if (improvementData.canExperience) {
    return "experience";
  }
  if (improvementData.canTraining) {
    return "training";
  }
  return null;
}

/**
 * @internal
 * Internal helper extracted for focused unit tests.
 */
export function buildCharacteristicAdapter(
  actor: RqgActor,
  characteristicName: keyof Characteristics,
): CharacteristicImprovementData {
  const sourceChar = getActorSourceCharacteristicOrThrow(actor, characteristicName);
  return buildCharacteristicAdapterFromSource(actor, sourceChar);
}

function buildCharacteristicAdapterFromSource(
  actor: RqgActor,
  sourceChar: SourceCharacteristic,
): CharacteristicImprovementData {
  const baseValue: number = sourceChar.value ?? 0;
  const characteristicName = sourceChar.name;
  const trainable = ["strength", "constitution", "dexterity", "power", "charisma"];
  const researchable = ["strength", "constitution", "dexterity", "charisma"];
  const canUseExperienceType = characteristicName === "power";
  const canUseTrainingType = trainable.includes(characteristicName);
  const canUseResearchType = researchable.includes(characteristicName);

  const rollmax = Roll.create(sourceChar.formula);
  const speciesRollableMax = rollmax.evaluateSync({ maximize: true }).total || 0;
  const formulaMatch = sourceChar.formula
    .replaceAll(" ", "")
    .match(/(?:(?<diceCount>\d+)[dD]\d+\+?)?(?<bonusNumber>\d*)/);
  const diceCount = formulaMatch?.groups?.["diceCount"];
  const bonusNumber = formulaMatch?.groups?.["bonusNumber"];
  const speciesMin = Number(diceCount || 0) + Math.floor(Number(bonusNumber || 0) / 6);
  const speciesMax = speciesRollableMax + speciesMin;
  const isPowerCharacteristic = characteristicName === "power";
  const cultBonusRankOrder: Record<CultRankEnum, number> = {
    [CultRankEnum.LayMember]: 1,
    [CultRankEnum.Initiate]: 2,
    [CultRankEnum.GodTalker]: 3,
    [CultRankEnum.RunePriest]: 4,
    [CultRankEnum.RuneLord]: 5,
    [CultRankEnum.ChiefPriest]: 6,
    [CultRankEnum.HighPriest]: 7,
  };
  const cultBonusRanks: CultRankEnum[] = [
    CultRankEnum.GodTalker,
    CultRankEnum.RunePriest,
    CultRankEnum.ChiefPriest,
    CultRankEnum.HighPriest,
  ];
  const qualifyingCultRanks: CultRankEnum[] = [];
  if (isPowerCharacteristic) {
    for (const item of actor.items) {
      if (!isDocumentSubType<CultItem>(item, ItemTypeEnum.Cult)) {
        continue;
      }
      for (const joinedCult of item.system.joinedCults ?? []) {
        const rank = joinedCult.rank as CultRankEnum;
        if (cultBonusRanks.includes(rank)) {
          qualifyingCultRanks.push(rank);
        }
      }
    }
  }
  const highestQualifyingCultRank = qualifyingCultRanks.sort(
    (a: CultRankEnum, b: CultRankEnum) => cultBonusRankOrder[b] - cultBonusRankOrder[a],
  )[0];
  const cultStandingBonus = highestQualifyingCultRank ? 20 : 0;
  const cultBonusLabel = highestQualifyingCultRank
    ? localize(`RQG.Actor.RuneMagic.CultRank.${highestQualifyingCultRank}`)
    : "";

  const improvementData: CharacteristicImprovementData = {
    shortName: localize("RQG.Actor.Characteristics." + characteristicName),
    currentValueDisplay: String(baseValue),
    hasExperience: Boolean(sourceChar.hasExperience),
    cultBonusValue: cultStandingBonus,
    cultBonusLabel,
    canExperience: canUseExperienceType && Boolean(sourceChar.hasExperience),
    canTraining: canUseTrainingType,
    canResearch: canUseResearchType,
    showExperience: canUseExperienceType,
    showTraining: canUseTrainingType,
    showResearch: canUseResearchType,
    chance: baseValue,
    chanceToGain: ((speciesMax - baseValue) * 5 || 0) + cultStandingBonus,
    experienceGainFixed: 1,
    experienceGainRandom: "1d3-1",
    trainingGainRandom: "1d3-1",
    researchGainRandom: "1d3-1",
    trainingIsGated: isPowerCharacteristic,
    name: localize("RQG.Actor.Characteristics." + characteristicName + "-full"),
    typeLocName: localize("RQG.Actor.Characteristics.Characteristic"),
    speciesMax,
  };

  if (baseValue >= speciesMax) {
    improvementData.canExperience = false;
    improvementData.canTraining = false;
    improvementData.canResearch = false;
    improvementData.atSpeciesMax = true;
  }

  return improvementData;
}

function getActorSourceCharacteristicOrThrow(
  actor: RqgActor,
  characteristicName: keyof Characteristics,
): SourceCharacteristic {
  const sourceChar = actor._source.system?.characteristics?.[characteristicName];
  if (
    sourceChar == null ||
    sourceChar.value == null ||
    !Number.isFinite(Number(sourceChar.value)) ||
    typeof sourceChar.formula !== "string"
  ) {
    return logger.throw(
      "Tried to improve characteristic without complete source characteristic data",
      { actor, characteristicName },
    );
  }

  return {
    name: characteristicName,
    value: Number(sourceChar.value),
    formula: sourceChar.formula,
    hasExperience: sourceChar.hasExperience,
  };
}
