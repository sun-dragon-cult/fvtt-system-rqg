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
  filterToPlayerOwnedOptions,
  getBaseTokenOrActorOptions,
  getCharacteristicOptions,
  getTokenOrActorOptions,
  resolveActorFromUuid,
  resolveCharacteristicSide,
} from "./resistance-roll-shared.ts";
import { buildResistanceRollFlavor } from "../../rolls/resistance-roll/resistance-roll-flavor.ts";
import { computeResistanceTargetChance } from "../../rolls/resistance-roll/resistance-roll-formula.ts";
import { RqgInteractiveRollApplicationBase } from "../app-parts/rqg-interactive-roll-application-base";
import { getSpeakerCompat } from "../../system/fvtt-type-compat";

/**
 * GM-facing dialog (#758 option C): pick who should roll (an actor/token's characteristic(s))
 * and what they're resisting (another actor's characteristic(s), or a manual value/label such as
 * a disease's POT), then post a chat card only that recipient (and the GM) can act on. Unlike
 * ResistanceRollDialogV2 this dialog never rolls anything itself - it only creates the request;
 * RespondToResistanceRequestDialogV2 is what the recipient uses to actually roll.
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

    // Both sides share the same underlying targeted/owned-token/owned-actor scan - computed once
    // here and handed to both calls below instead of each re-scanning it independently.
    const baseTokenOrActorOptions = getBaseTokenOrActorOptions();

    // The active side is who gets asked to roll, so it's restricted to tokens/actors with an
    // actual player owner - a GM owns every token, so without this an NPC/monster could be picked
    // as the recipient and nobody but the GM could ever click that card's Roll button.
    const initialTargetActor = resolveActorFromUuid(initialTargetUuid);
    const initialTargetHasPlayerOwner = !!initialTargetActor?.hasPlayerOwner;
    // No Manual entry - the active side must be a real actor/token, since it's who the request
    // card is addressed to. `initialTargetUuid` is guaranteed to appear (even if not otherwise
    // owned-via-token/actor-setting) so the sheet this dialog was opened from is always pickable -
    // unless it has no player owner, in which case the GM must explicitly pick someone instead.
    const activeTokenOrActorOptions = getTokenOrActorOptions(
      initialTargetHasPlayerOwner ? initialTargetUuid : "",
      initialTargetHasPlayerOwner ? (initialTargetTokenOrActor?.name ?? "") : "",
      initialTargetHasPlayerOwner ? initialTargetActor : undefined,
      false,
      filterToPlayerOwnedOptions(baseTokenOrActorOptions),
    );
    // Manual is the common case here (a GM-known value like a disease's POT), so it's included.
    // A seeded passive (e.g. the NPC whose token HUD the request was opened from) is guaranteed to
    // appear even if it's not on the current scene / not otherwise owned.
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
    formData.activeCharacteristics ??= "";

    formData.passiveTokenOrActorUuid ??= this.seed.passiveUuid || MANUAL_SOURCE_VALUE;
    formData.passiveCharacteristics ??= "";
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
    };
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

    if (!formDataObject.targetTokenOrActorUuid || !active.label) {
      ui.notifications?.error("Pick who should roll and which characteristic(s) they roll with.");
      return;
    }
    if (!passive.label) {
      ui.notifications?.error("Pick or enter what the roll resists.");
      return;
    }

    const chatSystemData = {
      state: "Requested",
      targetTokenOrActorUuid: formDataObject.targetTokenOrActorUuid,
      activeCharacteristics: formDataObject.activeCharacteristics,
      passiveValue: passive.value,
      passiveLabel: passive.label,
      passiveActorName: passive.actorName,
      otherModifier: Number(formDataObject.otherModifier) || 0,
      otherModifierDescription: formDataObject.otherModifierDescription || undefined,
      resistanceRoll: undefined,
    };

    // Shown as the message author instead of the GM, so the card reads as the recipient's roll
    // request even though the GM is the one who posted it. Rendered concurrently with the chat
    // content below since neither depends on the other.
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

    activateChatTab();
    const cm = await ChatMessage.create({
      type: "resistanceRequest",
      system: chatSystemData,
      flavor: flavor,
      content: content,
      speaker: getSpeakerCompat({ actor: targetActor ?? undefined, token: targetToken }),
    } as any);
    if (cm && !Array.isArray(cm)) {
      cm.render(true);
    }
  }
}
