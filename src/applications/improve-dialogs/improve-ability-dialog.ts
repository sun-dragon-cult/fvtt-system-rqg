import { type AbilityItem, ItemTypeEnum } from "@item-model/item-types.ts";
import { RqgItem } from "../../items/rqg-item";
import { systemId } from "../../system/config";
import {
  convertFormValueToString,
  getSpeakerDisplayName,
  isDocumentSubType,
  localize,
} from "../../system/util";
import { templatePaths } from "../../system/load-handlebars-templates";
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
import {
  type AbilityImprovementData,
  type AbilityImprovementSource,
  buildAbilityImprovementData,
  buildAbilityImprovementRequest,
  getDefaultAbilityImprovementSource,
  isSupportedAbilityGainType,
} from "../../rolls/improvement-roll/ability-improvement-adapter";
import {
  getImprovementSourceFromGainType,
  improvementSources,
} from "../../rolls/improvement-roll/improvement-roll.types";
import { resolveImprovement } from "../../rolls/improvement-roll/improvement-roll";
import { showImprovementChatMessage } from "../../rolls/improvement-roll/improvement-roll-presenter";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const logger = new RqgLogger("improve-ability-dialog");

type ImproveAbilityDialogContext = {
  headerData: ImproveDialogHeaderData;
  improvementData: AbilityImprovementData;
  selectedSource: AbilityImprovementSource | null;
  showSourceChooser: boolean;
  buttons: ImproveDialogButton[];
};

class ImproveAbilityDialog extends HandlebarsApplicationMixin(
  ApplicationV2<ImproveAbilityDialogContext>,
) {
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
    this.improvementData = buildAbilityImprovementData(item);
    this.options.window.title = localize("RQG.Dialog.improveAbilityDialog.title", {
      name: this.improvementData.name,
      typeLocName: this.improvementData.typeLocName,
    });
  }

  override async _prepareContext(): Promise<ImproveAbilityDialogContext> {
    const improvementData = this.improvementData;
    const canSubmit = improvementData.canExperience || improvementData.canTraining;
    const sourceState = buildImproveDialogSourceState(
      getDefaultAbilityImprovementSource(improvementData),
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

  protected getSelectedImprovementSource(): AbilityImprovementSource | null {
    return getSelectedImprovementSourceFromForm(
      this.element,
      improvementSources,
      getDefaultAbilityImprovementSource(this.improvementData),
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

    if (!this.item.parent) {
      return logger.throw("Tried to improve item that isn't embedded on an actor", this.item);
    }

    // Rebuilt from live source data rather than trusting the dialog's construction-time snapshot:
    // the experience check, a skill's category mod, and a Rune's chance toward its 100% cap
    // (Core p.415) can all have changed through another route while this dialog was still open -
    // and the applied gain has to be clamped against the same current value it's presented against.
    const improvementData = buildAbilityImprovementData(this.item);
    const speakerName = getSpeakerDisplayName(this.speaker) || this.item.parent.name || "";

    const source = getImprovementSourceFromGainType(gainType);

    if (source === "experience" && !improvementData.canExperience) {
      ui.notifications?.error(
        localize("RQG.Dialog.improveAbilityDialog.notifications.noExperience", {
          actorName: speakerName,
          name: improvementData.name,
          typeLocName: improvementData.typeLocName,
        }),
      );
      // No gain to apply and canExperience is already false here, so skip the write entirely
      // rather than issuing a no-op Item update.
      return;
    }

    // The selected source can have gone stale (e.g. the ability crossed 75% or a Rune reached
    // 100% through another route) while this dialog was still open, so re-check it against the
    // just-rebuilt live flags rather than trusting the radio button that was chosen earlier.
    const canUseSource =
      source === "research" ? improvementData.canResearch : improvementData.canTraining;
    if (source !== "experience" && !canUseSource) {
      ui.notifications?.error(
        localize("RQG.Dialog.improveAbilityDialog.notifications.sourceNoLongerAvailable", {
          actorName: speakerName,
          name: improvementData.name,
          typeLocName: improvementData.typeLocName,
        }),
      );
      return;
    }

    const request = buildAbilityImprovementRequest(
      improvementData,
      gainType,
      speakerName,
      this.speaker,
    );
    const resolution = await resolveImprovement(request);
    await showImprovementChatMessage(resolution);
    await this.item.system.applyChanceGain(resolution.result.gain);
  }
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
