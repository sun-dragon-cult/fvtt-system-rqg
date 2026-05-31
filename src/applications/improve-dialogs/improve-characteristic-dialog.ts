import { RqgActor } from "../../actors/rqgActor";
import { convertFormValueToString, isDocumentSubType, localize, RqgError } from "../../system/util";
import { systemId } from "../../system/config";
import { ItemTypeEnum } from "@item-model/itemTypes.ts";
import { type CultItem, CultRankEnum } from "@item-model/cultDataModel.ts";
import { templatePaths } from "../../system/loadHandlebarsTemplates";
import type { Characteristics } from "../../data-model/actor-data/characteristics";
import { RqgLogger } from "../../system/logging/rqgLogger";
import {
  buildImproveDialogButtons,
  buildImproveDialogSourceState,
  getSelectedImprovementSourceFromForm,
  type ImproveDialogButton,
  type ImproveDialogHeaderData,
  isImprovementSelectionChangeEvent,
  syncImprovementSelectionUi,
} from "./improve-dialog-shared";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const IMPROVEMENT_SOURCES = ["experience", "training", "research"] as const;

type CharacteristicImprovementSource = "experience" | "training" | "research";

type SourceCharacteristic = {
  name: keyof Characteristics;
  value: number;
  formula: string;
  hasExperience?: boolean | null;
};

type CharacteristicImprovementData = {
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
};

type ImproveCharacteristicDialogContext = {
  headerData: ImproveDialogHeaderData;
  improvementData: CharacteristicImprovementData;
  selectedSource: CharacteristicImprovementSource | null;
  showSourceChooser: boolean;
  buttons: ImproveDialogButton[];
};

class ImproveCharacteristicDialog extends HandlebarsApplicationMixin(
  ApplicationV2<ImproveCharacteristicDialogContext>,
) {
  private static readonly logger = new RqgLogger("ImproveCharacteristicDialog");

  /** Precomputed dialog data model used by the template and improvement logic. */
  private readonly improvementData: CharacteristicImprovementData;

  static override DEFAULT_OPTIONS = {
    id: "improve-characteristic-dialog",
    tag: "form",
    classes: [systemId, "dialog"],
    window: {
      icon: "fa-solid fa-arrow-trend-up",
      contentClasses: ["standard-form", "improve-dialog"],
      resizable: false,
    },
    position: {
      width: 560,
    },
    form: {
      handler: ImproveCharacteristicDialog.onSubmit,
      closeOnSubmit: true,
    },
    actions: {
      cancel: ImproveCharacteristicDialog.onCancel,
    },
  };

  static override PARTS = {
    header: {
      template: templatePaths.improveDialogHeader,
      root: true,
    },
    body: {
      template: templatePaths.improveCharacteristicDialogBody,
    },
    footer: {
      template: "templates/generic/form-footer.hbs",
    },
  };

  constructor(
    private readonly actor: RqgActor,
    private readonly characteristicName: keyof Characteristics,
    private readonly speakerName: string,
  ) {
    super();
    this.improvementData = buildCharacteristicAdapter(actor, characteristicName);
  }

  override async _prepareContext(): Promise<ImproveCharacteristicDialogContext> {
    const improvementData = this.improvementData;
    this.options.window.title = localize("RQG.Dialog.improveAbilityDialog.titleChar", {
      name: improvementData.name,
      typeLocName: improvementData.typeLocName,
    });
    const canSubmit =
      improvementData.canExperience || improvementData.canTraining || improvementData.canResearch;
    const sourceState = buildImproveDialogSourceState(
      getDefaultImprovementSource(improvementData),
      [improvementData.showExperience, improvementData.showTraining, improvementData.showResearch],
    );
    return {
      headerData: {
        name: improvementData.name,
        typeLocName: improvementData.typeLocName,
        currentValueDisplay: improvementData.currentValueDisplay,
        chipText: improvementData.shortName,
        chipClass: "norse",
      },
      improvementData,
      selectedSource: sourceState.selectedSource,
      showSourceChooser: sourceState.showSourceChooser,
      buttons: buildImproveDialogButtons(
        canSubmit,
        "RQG.Dialog.improveAbilityDialog.btnDoImprovement",
        "RQG.Dialog.improveAbilityDialog.btnCancel",
      ),
    };
  }

  override async _onRender(
    context: ImproveCharacteristicDialogContext,
    options: foundry.applications.api.ApplicationV2.RenderOptions,
  ): Promise<void> {
    await super._onRender(context, options);
    this.syncImprovementSelectionUi();
  }

  protected override _onChangeForm(formConfig: any, event: Event): void {
    if (isImprovementSelectionChangeEvent(event)) {
      this.syncImprovementSelectionUi();
    }
    super._onChangeForm(formConfig, event);
  }

  private static onCancel(this: ImproveCharacteristicDialog): void {
    this.close();
  }

  private static async onSubmit(
    this: ImproveCharacteristicDialog,
    _event: Event,
    _form: HTMLFormElement,
    formData: foundry.applications.ux.FormDataExtended,
  ): Promise<void> {
    const gainType = convertFormValueToString(
      (formData.object["experiencegaintype"] as FormDataEntryValue | null | undefined) ?? null,
    );
    await this.improveCharacteristic(gainType);
  }

  protected getSelectedImprovementSource(): CharacteristicImprovementSource | null {
    return getSelectedImprovementSourceFromForm(
      this.element,
      IMPROVEMENT_SOURCES,
      getDefaultImprovementSource(this.improvementData),
    );
  }

  private syncImprovementSelectionUi(): void {
    syncImprovementSelectionUi(this.element, this.getSelectedImprovementSource());
  }

  private async improveCharacteristic(gainType: string): Promise<void> {
    if (!gainType) {
      return;
    }

    const improvementData = this.improvementData;
    const gain = await this.resolveCharacteristicGain(gainType);
    const baseValue = Number(improvementData.chance ?? 0);
    const charUpdate: any = {
      system: {
        characteristics: {
          [this.characteristicName]: { value: baseValue + gain },
        },
      },
    };

    if (improvementData.hasExperience) {
      charUpdate.system.characteristics[this.characteristicName].hasExperience = false;
    }

    await this.actor.update(charUpdate);
  }

  private async resolveCharacteristicGain(gainType: string): Promise<number> {
    if (gainType === "experience-gain-fixed" || gainType === "experience-gain-random") {
      return this.resolveExperienceGain(gainType);
    }

    if (gainType === "training-gain-random") {
      return this.resolveTrainingGain();
    }

    if (gainType === "research-gain-random") {
      return this.resolveResearchGain();
    }

    return 0;
  }

  private async resolveExperienceGain(
    gainType: "experience-gain-fixed" | "experience-gain-random",
  ): Promise<number> {
    const improvementData = this.improvementData;
    if (!improvementData.hasExperience) {
      const msg = localize("RQG.Dialog.improveAbilityDialog.notifications.noExperience", {
        actorName: this.actor.name,
        name: improvementData.name,
        typeLocName: improvementData.typeLocName,
      });
      ImproveCharacteristicDialog.logger.error(msg);
      return 0;
    }

    const expRoll = new Roll("1d100");
    await expRoll.toMessage({
      speaker: { alias: this.speakerName },
      flavor: `<div class="roll-action">${localize(
        "RQG.Dialog.improveAbilityDialog.experienceRoll.flavor",
        {
          actorName: this.actor.name,
          name: improvementData.name,
          typeLocName: improvementData.typeLocName,
        },
      )}</div><p>${localize("RQG.Dialog.improveAbilityDialog.experienceRoll.contentChar", {
        chance: improvementData.chance.toString(),
        chanceToGain: improvementData.chanceToGain.toString(),
        speciesMax: improvementData.speciesMax.toString(),
        name: improvementData.name,
        typeLocName: improvementData.typeLocName,
      })}</p>`,
    });

    if (expRoll.total === undefined || expRoll.total > improvementData.chanceToGain) {
      await ChatMessage.create({
        flavor: localize("RQG.Dialog.improveAbilityDialog.experienceGainFailed.flavor", {
          name: improvementData.name,
          typeLocName: improvementData.typeLocName,
        }),
        content: localize("RQG.Dialog.improveAbilityDialog.experienceGainFailed.content", {
          actorName: this.actor.name,
          name: improvementData.name,
          typeLocName: improvementData.typeLocName,
        }),
        speaker: { alias: this.speakerName },
      });
      return 0;
    }

    const originalAbilityValue = Number(improvementData.chance);
    const resultFlavor = localize("RQG.Dialog.improveAbilityDialog.experienceResultChat.flavor", {
      name: improvementData.name,
      typeLocName: improvementData.typeLocName,
    });

    if (gainType === "experience-gain-fixed") {
      const fixedGain = improvementData.experienceGainFixed;
      const newAbilityValue = originalAbilityValue + fixedGain;
      const gainRoll = new Roll(String(fixedGain));
      await gainRoll.toMessage({
        speaker: { alias: this.speakerName },
        flavor: `<div class="roll-action">${resultFlavor}</div><p>${localize(
          "RQG.Dialog.improveAbilityDialog.experienceResultChat.contentChoseFixed",
          {
            gain: fixedGain.toString(),
            from: originalAbilityValue.toString(),
            to: newAbilityValue.toString(),
          },
        )}</p>`,
      });
      return fixedGain;
    }

    const gainRoll = new Roll(improvementData.experienceGainRandom);
    await gainRoll.evaluate();
    const rolledGain = Number(gainRoll.total) || 0;
    const newAbilityValue = originalAbilityValue + rolledGain;
    await gainRoll.toMessage({
      speaker: { alias: this.speakerName },
      flavor: `<div class="roll-action">${resultFlavor}</div><p>${localize(
        "RQG.Dialog.improveAbilityDialog.experienceResultChat.contentChoseRandom",
        {
          gain: improvementData.experienceGainRandom,
          from: originalAbilityValue.toString(),
          to: newAbilityValue.toString(),
        },
      )}</p>`,
    });
    return rolledGain;
  }

  private async resolveTrainingGain(): Promise<number> {
    const improvementData = this.improvementData;
    const gainRoll = new Roll(improvementData.trainingGainRandom);
    await gainRoll.toMessage({
      speaker: { alias: this.speakerName },
      flavor: `<div class="roll-action">${localize(
        "RQG.Dialog.improveAbilityDialog.trainingResultChat.flavor",
        {
          name: improvementData.name,
          typeLocName: improvementData.typeLocName,
        },
      )}</div><p>${localize(
        "RQG.Dialog.improveAbilityDialog.trainingResultChat.contentChoseRandom",
        {
          gain: improvementData.trainingGainRandom,
        },
      )}</p>`,
    });
    return Number(gainRoll.total) || 0;
  }

  private async resolveResearchGain(): Promise<number> {
    const improvementData = this.improvementData;
    const expRoll = new Roll("1d100");
    await expRoll.toMessage({
      speaker: { alias: this.speakerName },
      flavor: `<div class="roll-action">${localize(
        "RQG.Dialog.improveAbilityDialog.researchRoll.flavor",
        {
          actorName: this.actor.name,
          name: improvementData.name,
          typeLocName: improvementData.typeLocName,
        },
      )}</div><p>${localize("RQG.Dialog.improveAbilityDialog.researchRoll.contentChar", {
        chance: improvementData.chance.toString(),
        chanceToGain: improvementData.chanceToGain.toString(),
        speciesMax: improvementData.speciesMax.toString(),
        name: improvementData.name,
        typeLocName: improvementData.typeLocName,
      })}</p>`,
    });

    if (expRoll.total === undefined || expRoll.total > improvementData.chanceToGain) {
      await ChatMessage.create({
        flavor: localize("RQG.Dialog.improveAbilityDialog.researchGainFailed.flavor", {
          name: improvementData.name,
          typeLocName: improvementData.typeLocName,
        }),
        content: localize("RQG.Dialog.improveAbilityDialog.researchGainFailed.content", {
          actorName: this.actor.name,
          name: improvementData.name,
          typeLocName: improvementData.typeLocName,
        }),
        speaker: { alias: this.speakerName },
      });
      return 0;
    }

    const gainRoll = new Roll(improvementData.researchGainRandom);
    await gainRoll.toMessage({
      speaker: { alias: this.speakerName },
      flavor: `<div class="roll-action">${localize(
        "RQG.Dialog.improveAbilityDialog.researchResultChat.flavor",
        {
          name: improvementData.name,
          typeLocName: improvementData.typeLocName,
        },
      )}</div><p>${localize(
        "RQG.Dialog.improveAbilityDialog.researchResultChat.contentChoseRandom",
        {
          gain: improvementData.researchGainRandom,
        },
      )}</p>`,
    });
    return Number(gainRoll.total) || 0;
  }
}

function getDefaultImprovementSource(
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

//**Shows a dialog for improving a Characteristic */
export async function showImproveCharacteristicDialog(
  actor: RqgActor,
  characteristicName: keyof Characteristics,
  speakerName: string,
): Promise<void> {
  const dialog = new ImproveCharacteristicDialog(actor, characteristicName, speakerName);
  await dialog.render({ force: true });
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
    throw new RqgError(
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
