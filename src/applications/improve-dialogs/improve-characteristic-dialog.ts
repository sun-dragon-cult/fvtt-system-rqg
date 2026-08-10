import { RqgActor } from "../../actors/rqg-actor";
import { convertFormValueToString, getSpeakerDisplayName, localize } from "../../system/util";
import { systemId } from "../../system/config";
import { templatePaths } from "../../system/load-handlebars-templates";
import type { Characteristics } from "../../data-model/actor-data/characteristics";
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
  applyCharacteristicGain,
  buildCharacteristicAdapter,
  buildCharacteristicImprovementRequest,
  type CharacteristicImprovementData,
  type CharacteristicImprovementSource,
  getDefaultCharacteristicImprovementSource,
  isSupportedCharacteristicGainType,
} from "../../rolls/improvement-roll/characteristic-improvement-adapter";
import {
  getImprovementSourceFromGainType,
  improvementSources,
} from "../../rolls/improvement-roll/improvement-roll.types";
import { resolveImprovement } from "../../rolls/improvement-roll/improvement-roll";
import { showImprovementChatMessage } from "../../rolls/improvement-roll/improvement-roll-presenter";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

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
    private readonly speaker: ChatMessage.SpeakerData,
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
      getDefaultCharacteristicImprovementSource(improvementData),
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
      improvementSources,
      getDefaultCharacteristicImprovementSource(this.improvementData),
    );
  }

  private syncImprovementSelectionUi(): void {
    syncImprovementSelectionUi(this.element, this.getSelectedImprovementSource());
  }

  private async improveCharacteristic(gainType: string): Promise<void> {
    if (!gainType || !isSupportedCharacteristicGainType(gainType)) {
      return;
    }

    // Rebuilt from live source data rather than trusting the dialog's construction-time snapshot:
    // the experience check and the characteristic's value can both have changed through another
    // route while this dialog was still open (Core p.415).
    const improvementData = buildCharacteristicAdapter(this.actor, this.characteristicName);
    const speakerName = getSpeakerDisplayName(this.speaker) || this.actor.name || "";

    const source = getImprovementSourceFromGainType(gainType);

    // The selected source can have gone stale (e.g. the characteristic reached its species
    // maximum through another route) while this dialog was still open, so re-check it against
    // the just-rebuilt live flags rather than trusting the radio button that was chosen earlier.
    const canUseSource =
      source === "experience"
        ? improvementData.canExperience
        : source === "research"
          ? improvementData.canResearch
          : improvementData.canTraining;
    if (!canUseSource) {
      ImproveCharacteristicDialog.logger.error(
        localize(
          source === "experience"
            ? "RQG.Dialog.improveAbilityDialog.notifications.noExperience"
            : "RQG.Dialog.improveAbilityDialog.notifications.sourceNoLongerAvailable",
          {
            actorName: speakerName,
            name: improvementData.name,
            typeLocName: improvementData.typeLocName,
          },
        ),
      );
      return;
    }

    const request = buildCharacteristicImprovementRequest(
      improvementData,
      gainType,
      speakerName,
      this.speaker,
    );
    const resolution = await resolveImprovement(request);
    await showImprovementChatMessage(resolution);
    await applyCharacteristicGain(
      this.actor,
      this.characteristicName,
      improvementData,
      resolution.result.gain,
    );
  }
}

//**Shows a dialog for improving a Characteristic */
export async function showImproveCharacteristicDialog(
  actor: RqgActor,
  characteristicName: keyof Characteristics,
  speaker: ChatMessage.SpeakerData,
): Promise<void> {
  const dialog = new ImproveCharacteristicDialog(actor, characteristicName, speaker);
  await dialog.render({ force: true });
}
