import { type AbilityItem, ItemTypeEnum } from "@item-model/item-types.ts";
import type { IAbility } from "../../data-model/shared/ability";
import { RqgItem } from "../../items/rqg-item";
import { systemId } from "../../system/config";
import {
  assertDocumentSubType,
  convertFormValueToString,
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
const IMPROVEMENT_SOURCES = ["experience", "training"] as const;
const SUPPORTED_ABILITY_GAIN_TYPES = [
  "experience-gain-fixed",
  "experience-gain-random",
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
  showTraining: boolean;
  canExperience: boolean;
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
  trainingGainFixed: number;
  trainingGainRandom: string;
};

type ImprovementSource = "experience" | "training";

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
    const actor = this.item.parent;
    if (!actor) {
      return logger.throw("Tried to improve item that isn't embedded on an actor", this.item);
    }

    let gain = 0;

    if (gainType === "experience-gain-fixed" || gainType === "experience-gain-random") {
      if (sourceAbility.hasExperience) {
        const categoryMod = improvementData.categoryMod ?? 0;
        const rollFlavor = localize("RQG.Dialog.improveAbilityDialog.experienceRoll.flavor", {
          actorName: this.speaker.alias as string,
          name: improvementData.name,
          typeLocName: improvementData.typeLocName,
        });

        const rollContent =
          improvementData.abilityType === "skill"
            ? localize("RQG.Dialog.improveAbilityDialog.experienceRoll.contentSkill", {
                mod: improvementData.categoryModDisplay ?? formatCategoryModDisplay(categoryMod),
                skillChance: improvementData.chance.toString(),
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
          (expRoll.total > Number(improvementData.chance) ||
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
              actorName: this.speaker.alias as string,
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
          actorName: this.speaker.alias as string,
          name: improvementData.name,
          typeLocName: improvementData.typeLocName,
        });
        ui.notifications?.error(msg);
      }
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
      showTraining: true,
      canExperience: Boolean(sourceAbility.hasExperience),
      canTraining: true,
      img: this.item.img,
      chance: sourceChance,
      chanceToGain: Math.max(100 - sourceChance, 1),
      requiredRoll: Math.min(Math.max(Math.floor(sourceChance) + 1, 1), 100),
      experienceGainFixed: 3,
      experienceGainRandom: "1d6",
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

function getDefaultImprovementSource(
  improvementData: AbilityImprovementData,
): ImprovementSource | null {
  if (improvementData.canExperience) {
    return "experience";
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

function updateAdapterForSkill(improvementData: AbilityImprovementData, item: RqgItem): void {
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

  if (improvementData.chance > 75) {
    //Cannot train skills over 75%
    improvementData.canTraining = false;
    improvementData.skillOver75 = true;
  }
}

function configureAdapterForAbilityItem(
  improvementData: AbilityImprovementData,
  item: RqgItem,
): void {
  if (isDocumentSubType<SkillItem>(item, ItemTypeEnum.Skill)) {
    updateAdapterForSkill(improvementData, item);
    return;
  }

  if (isDocumentSubType<PassionItem>(item, ItemTypeEnum.Passion)) {
    improvementData.abilityType = "passion";
    // Cannot train passions
    improvementData.showTraining = false;
    improvementData.canTraining = false;
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
