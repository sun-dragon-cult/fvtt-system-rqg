import { systemId } from "../../system/config";
import { templatePaths } from "../../system/load-handlebars-templates";
import type {
  ResistanceRequestDialogContext,
  ResistanceRequestDialogFormData,
  ResistanceRequestSeed,
} from "./resistance-request-dialog-data.types.ts";
import { MANUAL_SOURCE_VALUE } from "./resistance-roll-dialog-data.types.ts";
import { activateChatTab, localize } from "../../system/util";
import type { RqgActor } from "@actors/rqg-actor.ts";
import {
  buildResistanceChanceBreakdown,
  buildResistanceModifiers,
  defaultCharacteristic,
  filterToPlayerOwnedOptions,
  getBaseTokenOrActorOptions,
  getCharacteristicOptions,
  getTokenOrActorOptions,
  initialResistanceRollMode,
  RESISTANCE_REQUEST_ROLL_MODES,
  resolveActorFromUuid,
  resolveCharacteristicSide,
  resolveResistanceRequestVisibility,
} from "./resistance-roll-shared.ts";
import { buildResistanceRollFlavor } from "../../rolls/resistance-roll/resistance-roll-flavor.ts";
import { computeResistanceTargetChance } from "../../rolls/resistance-roll/resistance-roll-formula.ts";
import { RqgInteractiveRollApplicationBase } from "../app-parts/rqg-interactive-roll-application-base";
import { getConfiguredRollModeOptions, resolveRollModeFromForm } from "../app-parts/roll-mode";
import { getSpeakerCompat } from "../../system/fvtt-type-compat";

/**
 * GM builds a resistance-table check and posts it as a chat card the recipient rolls (via
 * RespondToResistanceRequestDialogV2). Never rolls anything itself.
 */
export class ResistanceRequestDialogV2 extends RqgInteractiveRollApplicationBase {
  protected override getLivePreviewFormBehaviorConfig() {
    return {
      submitButtonSelectorForBlurGuard: "button[data-send-resistance-request]",
      updateLivePreview: () => this.updateLivePreview(),
    };
  }

  private seed: ResistanceRequestSeed;

  constructor(
    seed: ResistanceRequestSeed = {},
    options?: Partial<foundry.applications.types.ApplicationConfiguration>,
  ) {
    super(options);
    this.seed = seed;
    this.rollMode = initialResistanceRollMode(undefined);
  }

  static override DEFAULT_OPTIONS = {
    id: `resistance-request-{id}`,
    tag: "form",
    classes: [systemId, "form", "roll-dialog", "resistance-request-dialog"],
    form: {
      handler: ResistanceRequestDialogV2.onSubmit,
      submitOnChange: false,
      closeOnSubmit: true,
    },
    position: {
      width: "auto" as const,
      height: "auto" as const,
      left: 35,
      top: 15,
    },
    window: {
      contentClasses: ["standard-form"],
      icon: "fa-solid fa-scale-unbalanced",
      title: "RQG.Dialog.ResistanceRequest.Title",
      resizable: false,
    },
  };

  static override PARTS = {
    header: { template: templatePaths.rollHeader },
    form: { template: templatePaths.resistanceRequestDialogV2, scrollable: [""] },
    footer: { template: templatePaths.resistanceRequestFooter },
  };

  override async _prepareContext(): Promise<ResistanceRequestDialogContext> {
    const formData = ((this.element &&
      new foundry.applications.ux.FormDataExtended(this.form!, {}).object) ??
      {}) as ResistanceRequestDialogFormData;

    const defaultTargetUuid =
      game.user?.targets.size === 1 ? (game.user.targets.first()?.document?.uuid ?? "") : "";
    const initialTargetUuid = this.seed.activeUuid || defaultTargetUuid || "";
    const initialTargetTokenOrActor = initialTargetUuid
      ? (fromUuidSync(initialTargetUuid) as TokenDocument | RqgActor | undefined)
      : undefined;

    // One token/actor scan, shared by both pickers.
    const baseTokenOrActorOptions = getBaseTokenOrActorOptions();

    // Active side = the request recipient, so it's limited to player-owned actors (a GM owns
    // every token) and has no Manual entry.
    const initialTargetActor = resolveActorFromUuid(initialTargetUuid);
    const initialTargetHasPlayerOwner = !!initialTargetActor?.hasPlayerOwner;
    const activeTokenOrActorOptions = getTokenOrActorOptions(
      initialTargetHasPlayerOwner ? initialTargetUuid : "",
      initialTargetHasPlayerOwner ? (initialTargetTokenOrActor?.name ?? "") : "",
      initialTargetHasPlayerOwner ? initialTargetActor : undefined,
      false,
      filterToPlayerOwnedOptions(baseTokenOrActorOptions),
    );
    // Passive side includes Manual (a GM-known POT etc.); the seeded passive is always listed.
    const seededPassiveUuid = this.seed.passiveUuid ?? "";
    const seededPassive = seededPassiveUuid
      ? (fromUuidSync(seededPassiveUuid) as TokenDocument | RqgActor | undefined)
      : undefined;
    const passiveTokenOrActorOptions = getTokenOrActorOptions(
      seededPassiveUuid,
      seededPassive?.name ?? "",
      resolveActorFromUuid(seededPassiveUuid),
      true,
      baseTokenOrActorOptions,
    );

    formData.targetTokenOrActorUuid ??= initialTargetHasPlayerOwner ? initialTargetUuid : "";
    formData.activeCharacteristics ??= defaultCharacteristic;

    formData.passiveTokenOrActorUuid ??= this.seed.passiveUuid || MANUAL_SOURCE_VALUE;
    formData.passiveCharacteristics ??= defaultCharacteristic;
    formData.passiveManualName ??= "";
    formData.passiveManualLabel ??= "";
    formData.passiveManualValue ??= 0;

    formData.otherModifier ??= "0";
    formData.otherModifierDescription ??= localize("RQG.Dialog.Common.OtherModifier");

    const totalChance = ResistanceRequestDialogV2.computeTotalChance(formData);
    const active = resolveCharacteristicSide(
      formData.targetTokenOrActorUuid,
      formData.activeCharacteristics,
      "",
      0,
      localize("RQG.Dialog.ResistanceRoll.Active"),
    );
    const passive = resolveCharacteristicSide(
      formData.passiveTokenOrActorUuid,
      formData.passiveCharacteristics,
      formData.passiveManualLabel,
      formData.passiveManualValue,
      localize("RQG.Dialog.ResistanceRoll.Passive"),
      formData.passiveManualName,
    );

    return {
      formData: formData,
      activeTokenOrActorOptions: activeTokenOrActorOptions,
      passiveTokenOrActorOptions: passiveTokenOrActorOptions,
      characteristicOptions: getCharacteristicOptions(),

      // RollHeader
      rollType: localize("RQG.Dialog.ResistanceRequest.Title"),
      rollName: `${active.label || "?"} ${localize("RQG.Roll.ResistanceRoll.Vs")} ${passive.label || "?"}`,
      baseChance: "",

      totalChance: totalChance,
      totalChanceTooltip: ResistanceRequestDialogV2.buildChanceBreakdown(formData),
      canSendRequest: ResistanceRequestDialogV2.canSendRequest(formData),
      rollMode: this.rollMode,
      rollModes: getConfiguredRollModeOptions(RESISTANCE_REQUEST_ROLL_MODES),
    };
  }

  private static buildChanceBreakdown(formData: ResistanceRequestDialogFormData): string {
    const active = resolveCharacteristicSide(
      formData.targetTokenOrActorUuid,
      formData.activeCharacteristics,
      "",
      0,
      "",
    );
    const passive = resolveCharacteristicSide(
      formData.passiveTokenOrActorUuid,
      formData.passiveCharacteristics,
      formData.passiveManualLabel,
      formData.passiveManualValue,
      "",
    );
    return buildResistanceChanceBreakdown(
      active,
      passive,
      buildResistanceModifiers("0", "0", formData.otherModifier, formData.otherModifierDescription),
    );
  }

  /** Both sides resolve to a value/label - gates the Send button. */
  private static canSendRequest(formData: ResistanceRequestDialogFormData): boolean {
    if (!formData.targetTokenOrActorUuid) {
      return false;
    }
    const active = resolveCharacteristicSide(
      formData.targetTokenOrActorUuid,
      formData.activeCharacteristics,
      "",
      0,
      "",
    );
    const passive = resolveCharacteristicSide(
      formData.passiveTokenOrActorUuid,
      formData.passiveCharacteristics,
      formData.passiveManualLabel,
      formData.passiveManualValue,
      "",
      formData.passiveManualName,
    );
    return !!active.label && !!passive.label;
  }

  private static computeTotalChance(formData: ResistanceRequestDialogFormData): number {
    const active = resolveCharacteristicSide(
      formData.targetTokenOrActorUuid,
      formData.activeCharacteristics,
      "",
      0,
      "",
    );
    const passive = resolveCharacteristicSide(
      formData.passiveTokenOrActorUuid,
      formData.passiveCharacteristics,
      formData.passiveManualLabel,
      formData.passiveManualValue,
      "",
    );
    return computeResistanceTargetChance(active.value, passive.value, [
      Number(formData.otherModifier),
    ]);
  }

  private updateLivePreview(): void {
    const formData = new foundry.applications.ux.FormDataExtended(this.element, {})
      .object as ResistanceRequestDialogFormData;
    this.updateTotalChanceDisplay(ResistanceRequestDialogV2.computeTotalChance(formData));

    const targetChanceBox = this.element.querySelector<HTMLElement>("[data-target-chance-box]");
    if (targetChanceBox) {
      targetChanceBox.dataset["tooltip"] = ResistanceRequestDialogV2.buildChanceBreakdown(formData);
    }

    const sendButton = this.element.querySelector<HTMLButtonElement>(
      "button[data-send-resistance-request]",
    );
    if (sendButton) {
      sendButton.disabled = !ResistanceRequestDialogV2.canSendRequest(formData);
    }
  }

  private static async onSubmit(
    event: SubmitEvent | Event,
    form: HTMLFormElement,
    formData: foundry.applications.ux.FormDataExtended,
  ): Promise<void> {
    const formDataObject = formData.object as ResistanceRequestDialogFormData;

    const active = resolveCharacteristicSide(
      formDataObject.targetTokenOrActorUuid,
      formDataObject.activeCharacteristics,
      "",
      0,
      "",
    );
    const passive = resolveCharacteristicSide(
      formDataObject.passiveTokenOrActorUuid,
      formDataObject.passiveCharacteristics,
      formDataObject.passiveManualLabel,
      formDataObject.passiveManualValue,
      "",
      formDataObject.passiveManualName,
    );

    // Send is disabled until valid; a stray submit just bails.
    if (!ResistanceRequestDialogV2.canSendRequest(formDataObject)) {
      return;
    }

    const rollMode = resolveRollModeFromForm(form);
    const chatSystemData = {
      state: "Requested",
      targetTokenOrActorUuid: formDataObject.targetTokenOrActorUuid,
      activeCharacteristics: formDataObject.activeCharacteristics,
      passiveCharacteristics:
        formDataObject.passiveTokenOrActorUuid === MANUAL_SOURCE_VALUE
          ? ""
          : formDataObject.passiveCharacteristics,
      passiveValue: passive.value,
      passiveLabel: passive.label,
      passiveActorName: passive.actorName,
      otherModifier: Number(formDataObject.otherModifier) || 0,
      otherModifierDescription: formDataObject.otherModifierDescription || undefined,
      rollMode: rollMode,
      resistanceRoll: undefined,
    };

    // Author the card as the recipient, not the GM.
    const [content, targetTokenOrActor] = await Promise.all([
      foundry.applications.handlebars.renderTemplate(
        templatePaths.resistanceRequestChatMessage,
        chatSystemData,
      ),
      fromUuid(formDataObject.targetTokenOrActorUuid) as Promise<
        TokenDocument | RqgActor | undefined
      >,
    ]);

    const flavor = buildResistanceRollFlavor(active.label, passive.label, passive.actorName);

    const targetToken =
      targetTokenOrActor instanceof TokenDocument ? targetTokenOrActor : undefined;
    const targetActor =
      targetTokenOrActor instanceof TokenDocument ? targetTokenOrActor.actor : targetTokenOrActor;

    const { whisper, blind } = resolveResistanceRequestVisibility(
      rollMode,
      targetActor ?? undefined,
    );

    activateChatTab();
    const cm = await ChatMessage.create({
      type: "resistanceRequest",
      system: chatSystemData,
      flavor: flavor,
      content: content,
      speaker: getSpeakerCompat({ actor: targetActor ?? undefined, token: targetToken }),
      whisper: whisper,
      blind: blind,
    } as any);
    if (cm && !Array.isArray(cm)) {
      cm.render(true);
    }
  }
}
