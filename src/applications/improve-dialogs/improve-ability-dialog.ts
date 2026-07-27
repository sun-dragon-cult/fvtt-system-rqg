import { type AbilityItem, ItemTypeEnum } from "@item-model/item-types.ts";
import type { IAbility } from "../../data-model/shared/ability";
import { RqgItem } from "../../items/rqg-item";
import { systemId } from "../../system/config";
import {
  assertDocumentSubType,
  convertFormValueToString,
  getSpeakerDisplayName,
  isDocumentSubType,
  localize,
  localizeItemType,
  toSignedString,
} from "../../system/util";
import { templatePaths } from "../../system/load-handlebars-templates";
import { ActorTypeEnum, type CharacterActor } from "../../data-model/actor-data/rqg-actor-data.ts";
import type { PassionItem } from "@item-model/passion-data-model.ts";
import type { RuneItem } from "@item-model/rune-data-model.ts";
import type { SkillItem } from "@item-model/skill-data-model.ts";
import { RqgLogger } from "../../system/logging/rqg-logger";
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

const logger = new RqgLogger("improve-ability-dialog");
const IMPROVEMENT_SOURCES = ["experience", "research", "training"] as const;
const SUPPORTED_ABILITY_GAIN_TYPES = [
  "experience-gain-fixed",
  "experience-gain-random",
  "research-gain-fixed",
  "research-gain-random",
  "training-gain-fixed",
  "training-gain-random",
] as const;

type AbilityType = "passion" | "skill" | "rune";

type AbilityImprovementData = {
  abilityType: AbilityType;
  typeLocName: string; // Translated item type
  name: string; // name of item
  currentValueDisplay: string;
  showExperience: boolean;
  showResearch: boolean;
  showTraining: boolean;
  canExperience: boolean;
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
  experienceGainFixed: number;
  experienceGainRandom: string;
  researchGainFixed: number;
  researchGainRandom: string;
  trainingGainFixed: number;
  trainingGainRandom: string;
};

type ImprovementSource = "experience" | "research" | "training";

type ImproveAbilityDialogContext = {
  headerData: ImproveDialogHeaderData;
  improvementData: AbilityImprovementData;
  selectedSource: ImprovementSource | null;
  showSourceChooser: boolean;
  buttons: ImproveDialogButton[];
};

export function isSupportedAbilityGainType(gainType: string): boolean {
  return (SUPPORTED_ABILITY_GAIN_TYPES as readonly string[]).includes(gainType);
}

class ImproveAbilityDialog extends HandlebarsApplicationMixin(
  ApplicationV2<ImproveAbilityDialogContext>,
) {
  private static readonly logger = new RqgLogger("ImproveAbilityDialog");

  /** Precomputed dialog data model used by the template and improvement logic. */
  private readonly improvementData: AbilityImprovementData;

  static override DEFAULT_OPTIONS = {
    id: "improve-ability-dialog",
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
      handler: ImproveAbilityDialog.onSubmit,
      closeOnSubmit: true,
    },
    actions: {
      cancel: ImproveAbilityDialog.onCancel,
    },
  };

  static override PARTS = {
    header: {
      template: templatePaths.improveDialogHeader,
      root: true,
    },
    body: {
      template: templatePaths.improveAbilityDialogBody,
    },
    footer: {
      template: "templates/generic/form-footer.hbs",
    },
  };

  constructor(
    private readonly item: AbilityItem,
    private readonly speaker: ChatMessage.SpeakerData,
  ) {
    super();
    this.improvementData = this.buildAdapter();
    this.options.window.title = localize("RQG.Dialog.improveAbilityDialog.title", {
      name: this.improvementData.name,
      typeLocName: this.improvementData.typeLocName,
    });
  }

  override async _prepareContext(): Promise<ImproveAbilityDialogContext> {
    const improvementData = this.improvementData;
    const canSubmit = improvementData.canExperience || improvementData.canTraining;
    const sourceState = buildImproveDialogSourceState(
      getDefaultImprovementSource(improvementData),
      [improvementData.showExperience, improvementData.showTraining],
    );
    return {
      headerData: {
        name: improvementData.name,
        typeLocName: improvementData.typeLocName,
        currentValueDisplay: improvementData.currentValueDisplay,
        imageSrc: improvementData.img,
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
    context: ImproveAbilityDialogContext,
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

  private static onCancel(this: ImproveAbilityDialog): void {
    this.close();
  }

  private static async onSubmit(
    this: ImproveAbilityDialog,
    _event: Event,
    _form: HTMLFormElement,
    formData: foundry.applications.ux.FormDataExtended,
  ): Promise<void> {
    const gainType = convertFormValueToString(
      (formData.object["experiencegaintype"] as FormDataEntryValue | null | undefined) ?? null,
    );
    await this.improveAbility(gainType);
  }

  protected getSelectedImprovementSource(): ImprovementSource | null {
    return getSelectedImprovementSourceFromForm(
      this.element,
      IMPROVEMENT_SOURCES,
      getDefaultImprovementSource(this.improvementData),
    );
  }

  private syncImprovementSelectionUi(): void {
    syncImprovementSelectionUi(this.element, this.getSelectedImprovementSource());
  }

  private async improveAbility(gainType: string): Promise<void> {
    if (!gainType) {
      logger.warn(
        "Skipping ability improvement because no gain type was selected",
        { notify: false },
        { itemId: this.item.id },
      );
      return;
    }

    if (!isSupportedAbilityGainType(gainType)) {
      logger.warn(
        "Skipping ability improvement because gain type is unsupported",
        { notify: false },
        { itemId: this.item.id, gainType },
      );
      return;
    }

    const improvementData = this.improvementData;
    const abilityData = this.item.system;
    const sourceAbility = this.item._source.system as Partial<IAbility>;
    const speakerName = getSpeakerDisplayName(this.speaker) || this.item.parent?.name || "";
    const actor = this.item.parent;
    if (!actor) {
      return logger.throw("Tried to improve item that isn't embedded on an actor", this.item);
    }

    let gain = 0;

    if (gainType === "experience-gain-fixed" || gainType === "experience-gain-random") {
      if (sourceAbility.hasExperience) {
        const categoryMod = improvementData.categoryMod ?? 0;
        const rollFlavor = localize("RQG.Dialog.improveAbilityDialog.experienceRoll.flavor", {
          actorName: speakerName,
          name: improvementData.name,
          typeLocName: improvementData.typeLocName,
        });

        const rollContent =
          improvementData.abilityType === "skill"
            ? localize("RQG.Dialog.improveAbilityDialog.experienceRoll.contentSkill", {
                mod: improvementData.categoryModDisplay ?? formatCategoryModDisplay(categoryMod),
                skillChance: getGateThreshold(improvementData).toString(),
                name: improvementData.name,
                typeLocName: improvementData.typeLocName,
              })
            : localize("RQG.Dialog.improveAbilityDialog.experienceRoll.contentOther", {
                chance: improvementData.chance.toString(),
                name: improvementData.name,
                typeLocName: improvementData.typeLocName,
              });

        const expRoll = new Roll(
          improvementData.abilityType === "skill"
            ? buildSkillExperienceRollFormula(categoryMod)
            : "1d100",
        );
        await expRoll.toMessage({
          speaker: this.speaker,
          flavor: `<div class="roll-action">${rollFlavor}</div><p>${rollContent}</p>`,
        });

        const isNaturalHundredOnSkillRoll =
          improvementData.abilityType === "skill" && expRoll.dice[0]?.total === 100;

        if (
          expRoll.total !== undefined &&
          (expRoll.total > getGateThreshold(improvementData) ||
            expRoll.total >= 100 ||
            isNaturalHundredOnSkillRoll)
        ) {
          const originalAbilityValue = Number(improvementData.chance);
          const resultFlavor = localize(
            "RQG.Dialog.improveAbilityDialog.experienceResultChat.flavor",
            { name: improvementData.name, typeLocName: improvementData.typeLocName },
          );

          if (gainType === "experience-gain-fixed") {
            const fixedGain = improvementData.experienceGainFixed;
            const newAbilityValue = originalAbilityValue + fixedGain;
            const resultContentChoseFixed = localize(
              "RQG.Dialog.improveAbilityDialog.experienceResultChat.contentChoseFixed",
              {
                gain: `${fixedGain}%`,
                from: `${originalAbilityValue}%`,
                to: `${newAbilityValue}%`,
              },
            );
            const gainRoll = new Roll(String(fixedGain));
            await gainRoll.toMessage({
              speaker: this.speaker,
              flavor: `<div class="roll-action">${resultFlavor}</div><p>${resultContentChoseFixed}</p>`,
            });
            gain = fixedGain;
          }

          if (gainType === "experience-gain-random") {
            const gainRoll = new Roll(improvementData.experienceGainRandom);
            await gainRoll.evaluate();
            const rolledGain = Number(gainRoll.total) || 0;
            const newAbilityValue = originalAbilityValue + rolledGain;
            const randomGainFormula = `${improvementData.experienceGainRandom}%`;
            const resultContentChoseRandom = localize(
              "RQG.Dialog.improveAbilityDialog.experienceResultChat.contentChoseRandom",
              {
                gain: randomGainFormula,
                from: `${originalAbilityValue}%`,
                to: `${newAbilityValue}%`,
              },
            );
            await gainRoll.toMessage({
              speaker: this.speaker,
              flavor: `<div class="roll-action">${resultFlavor}</div><p>${resultContentChoseRandom}</p>`,
            });
            gain = rolledGain;
          }
        } else {
          const failedFlavor = localize(
            "RQG.Dialog.improveAbilityDialog.experienceGainFailed.flavor",
            { name: improvementData.name, typeLocName: improvementData.typeLocName },
          );
          const failedContent = localize(
            "RQG.Dialog.improveAbilityDialog.experienceGainFailed.content",
            {
              actorName: speakerName,
              name: improvementData.name,
              typeLocName: improvementData.typeLocName,
            },
          );
          await ChatMessage.create({
            speaker: this.speaker,
            flavor: failedFlavor,
            content: failedContent,
          });
        }
      } else {
        const msg = localize("RQG.Dialog.improveAbilityDialog.notifications.noExperience", {
          actorName: speakerName,
          name: improvementData.name,
          typeLocName: improvementData.typeLocName,
        });
        ui.notifications?.error(msg);
      }
    }

    if (gainType === "research-gain-fixed" || gainType === "research-gain-random") {
      gain = await this.resolveResearchGain(gainType, speakerName);
    }

    if (gainType === "training-gain-fixed") {
      const flavor = localize("RQG.Dialog.improveAbilityDialog.trainingResultChat.flavor", {
        name: improvementData.name,
        typeLocName: improvementData.typeLocName,
      });
      const content = localize(
        "RQG.Dialog.improveAbilityDialog.trainingResultChat.contentChoseFixed",
        {
          gain: improvementData.trainingGainFixed + "%",
        },
      );
      const roll = new Roll(String(improvementData.trainingGainFixed));
      await roll.toMessage({
        speaker: this.speaker,
        flavor: `<div class="roll-action">${flavor}</div><p>${content}</p>`,
      });
      gain = improvementData.trainingGainFixed;
    }

    if (gainType === "training-gain-random") {
      const flavor = localize("RQG.Dialog.improveAbilityDialog.trainingResultChat.flavor", {
        name: improvementData.name,
        typeLocName: improvementData.typeLocName,
      });
      const content = localize(
        "RQG.Dialog.improveAbilityDialog.trainingResultChat.contentChoseRandom",
        {
          gain: improvementData.trainingGainRandom + "%",
        },
      );
      const gainRoll = new Roll(improvementData.trainingGainRandom);
      await gainRoll.toMessage({
        speaker: this.speaker,
        flavor: `<div class="roll-action">${flavor}</div><p>${content}</p>`,
      });
      gain = Number(gainRoll.total) || 0;
    }

    await abilityData.applyChanceGain(gain);
  }

  /**
   * Research (Core p.417) requires the same gate roll as Experience, but unlike Experience it
   * doesn't require a prior in-play experience check - it's self-directed study instead.
   */
  private async resolveResearchGain(
    gainType: "research-gain-fixed" | "research-gain-random",
    speakerName: string,
  ): Promise<number> {
    const improvementData = this.improvementData;
    const categoryMod = improvementData.categoryMod ?? 0;
    const rollFlavor = localize("RQG.Dialog.improveAbilityDialog.researchRoll.flavor", {
      actorName: speakerName,
      name: improvementData.name,
      typeLocName: improvementData.typeLocName,
    });

    const rollContent =
      improvementData.abilityType === "skill"
        ? localize("RQG.Dialog.improveAbilityDialog.researchRoll.contentSkill", {
            mod: improvementData.categoryModDisplay ?? formatCategoryModDisplay(categoryMod),
            skillChance: getGateThreshold(improvementData).toString(),
            name: improvementData.name,
            typeLocName: improvementData.typeLocName,
          })
        : localize("RQG.Dialog.improveAbilityDialog.researchRoll.contentOther", {
            chance: improvementData.chance.toString(),
            name: improvementData.name,
            typeLocName: improvementData.typeLocName,
          });

    const gateRoll = new Roll(
      improvementData.abilityType === "skill"
        ? buildSkillExperienceRollFormula(categoryMod)
        : "1d100",
    );
    await gateRoll.toMessage({
      speaker: this.speaker,
      flavor: `<div class="roll-action">${rollFlavor}</div><p>${rollContent}</p>`,
    });

    const isNaturalHundredOnSkillRoll =
      improvementData.abilityType === "skill" && gateRoll.dice[0]?.total === 100;

    if (
      gateRoll.total === undefined ||
      !(
        gateRoll.total > getGateThreshold(improvementData) ||
        gateRoll.total >= 100 ||
        isNaturalHundredOnSkillRoll
      )
    ) {
      await ChatMessage.create({
        speaker: this.speaker,
        flavor: localize("RQG.Dialog.improveAbilityDialog.researchGainFailed.flavor", {
          name: improvementData.name,
          typeLocName: improvementData.typeLocName,
        }),
        content: localize("RQG.Dialog.improveAbilityDialog.researchGainFailed.content", {
          actorName: speakerName,
          name: improvementData.name,
          typeLocName: improvementData.typeLocName,
        }),
      });
      return 0;
    }

    const resultFlavor = localize("RQG.Dialog.improveAbilityDialog.researchResultChat.flavor", {
      name: improvementData.name,
      typeLocName: improvementData.typeLocName,
    });

    if (gainType === "research-gain-fixed") {
      const fixedGain = improvementData.researchGainFixed;
      const content = localize(
        "RQG.Dialog.improveAbilityDialog.researchResultChat.contentChoseFixed",
        { gain: `${fixedGain}%` },
      );
      const gainRoll = new Roll(String(fixedGain));
      await gainRoll.toMessage({
        speaker: this.speaker,
        flavor: `<div class="roll-action">${resultFlavor}</div><p>${content}</p>`,
      });
      return fixedGain;
    }

    const gainRoll = new Roll(improvementData.researchGainRandom);
    await gainRoll.evaluate();
    const content = localize(
      "RQG.Dialog.improveAbilityDialog.researchResultChat.contentChoseRandom",
      { gain: `${improvementData.researchGainRandom}%` },
    );
    await gainRoll.toMessage({
      speaker: this.speaker,
      flavor: `<div class="roll-action">${resultFlavor}</div><p>${content}</p>`,
    });
    return Number(gainRoll.total) || 0;
  }

  private buildAdapter(): AbilityImprovementData {
    const sourceAbility = this.item._source.system as Partial<IAbility>;
    const sourceChance = Number(sourceAbility.chance ?? 0);
    const abilityType = getAbilityType(this.item);

    const improvementData: AbilityImprovementData = {
      name: this.item.name ?? "",
      typeLocName: localizeItemType(this.item.type),
      abilityType,
      currentValueDisplay: "",
      showExperience: Boolean(sourceAbility.hasExperience),
      showResearch: true,
      showTraining: true,
      canExperience: Boolean(sourceAbility.hasExperience),
      canResearch: true,
      canTraining: true,
      img: this.item.img,
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

    configureAdapterForAbilityItem(improvementData, this.item);

    improvementData.currentValueDisplay = `${improvementData.chance}%`;
    return improvementData;
  }
}

export function buildSkillExperienceRollFormula(categoryMod: number): string {
  if (categoryMod === 0) {
    return "1d100";
  }
  const signed = toSignedString(categoryMod).replace(/\s+/g, "");
  const normalizedSigned = signed.startsWith("+") || signed.startsWith("-") ? signed : `+${signed}`;
  return `1d100${normalizedSigned}[category mod]`;
}

export function formatCategoryModDisplay(categoryMod: number): string {
  return toSignedString(categoryMod);
}

/**
 * The gate-roll threshold for Experience/Research: the *unmodified* skill value for skills
 * (the category modifier is already baked into the roll itself via
 * `buildSkillExperienceRollFormula`, so using the modified `chance` here would cancel it out),
 * or the plain chance for Runes/Passions (Core p.415-416: they get no category modifier).
 */
export function getGateThreshold(improvementData: AbilityImprovementData): number {
  return improvementData.abilityType === "skill"
    ? Number(improvementData.skillChance ?? 0)
    : Number(improvementData.chance);
}

function getDefaultImprovementSource(
  improvementData: AbilityImprovementData,
): ImprovementSource | null {
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

/** Shows a dialog for improving a Passion, Rune, or Skill */
export async function showImproveAbilityDialog(
  item: RqgItem | undefined,
  speaker: ChatMessage.SpeakerData,
): Promise<void> {
  if (!item) {
    return logger.throw("Tried to show improve ability dialog without ability item");
  }
  if (
    !isDocumentSubType<SkillItem>(item, ItemTypeEnum.Skill) &&
    !isDocumentSubType<PassionItem>(item, ItemTypeEnum.Passion) &&
    !isDocumentSubType<RuneItem>(item, ItemTypeEnum.Rune)
  ) {
    logger.error(
      "Call to submitImproveAbilityDialog with item that was not a Passion, Rune, or Skill",
    );
    return;
  }

  const dialog = new ImproveAbilityDialog(item, speaker);
  await dialog.render({ force: true });
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
  improvementData.categoryMod = Number(
    actor.system.baseSkillCategoryModifiers[item.system.category] ?? 0,
  );
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

  if (improvementData.chance >= 75) {
    // Cannot train skills at or above 75%
    improvementData.canTraining = false;
    improvementData.skillOver75 = true;
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
    return;
  }

  logger.throw(
    "Call to submitImproveAbilityDialog with item that was not a Passion, Rune, or Skill",
    item,
  );
}
