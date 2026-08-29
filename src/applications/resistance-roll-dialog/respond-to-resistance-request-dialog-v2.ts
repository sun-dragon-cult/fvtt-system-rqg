import { systemId } from "../../system/config";
import { templatePaths } from "../../system/load-handlebars-templates";
import type {
  RespondToResistanceRequestDialogContext,
  RespondToResistanceRequestDialogFormData,
} from "./respond-to-resistance-request-dialog-data.types.ts";
import {
  activateChatTab,
  getSpeakerDisplayName,
  isDocumentSubType,
  localize,
} from "../../system/util";
import type { RqgActor } from "@actors/rqg-actor.ts";
import { ActorTypeEnum, type CharacterActor } from "../../data-model/actor-data/rqg-actor-data";
import type { ResistanceRollOptions } from "../../rolls/resistance-roll/resistance-roll.types";
import { ResistanceRoll } from "../../rolls/resistance-roll/resistance-roll";
import { computeResistanceTargetChance } from "../../rolls/resistance-roll/resistance-roll-formula.ts";
import {
  augmentOptions,
  buildResistanceModifiers,
  decodeCharacteristics,
  meditateOptions,
  resolveCharacteristicLabel,
  resolveCharacteristicValue,
} from "./resistance-roll-shared.ts";
import { getConfiguredRollModeOptions, resolveRollModeFromForm } from "../app-parts/roll-mode";
import { RqgInteractiveRollApplicationBase } from "../app-parts/rqg-interactive-roll-application-base";
import { getSpeakerCompat } from "../../system/fvtt-type-compat";
import { updateChatMessage } from "../../sockets/socketable-requests";
import type { ResistanceRequestChatMessage } from "../../chat/data-model/resistance-request-chat-message.types.ts";
import { RqgLogger } from "../../system/logging/rqg-logger";

const logger = new RqgLogger("RespondToResistanceRequestDialogV2");

/**
 * The recipient answers a resistance-request card: both sides are fixed by the request, they only
 * pick their own modifiers. The roll is written back onto the original message, not a new one.
 */
export class RespondToResistanceRequestDialogV2 extends RqgInteractiveRollApplicationBase {
  protected override getLivePreviewFormBehaviorConfig() {
    return {
      submitButtonSelectorForBlurGuard: "button[data-ability-roll]",
      updateLivePreview: () => this.updateLivePreview(),
    };
  }

  private requestChatMessage: ResistanceRequestChatMessage;
  private activeValue = 0;
  private passiveValue = 0;

  constructor(
    chatMessageId: string,
    options?: Partial<foundry.applications.types.ApplicationConfiguration>,
  ) {
    super(options);
    const requestChatMessage = game.messages?.get(chatMessageId ?? "") as
      ResistanceRequestChatMessage | undefined;
    if (!requestChatMessage) {
      logger.throw("No resistance request chat message found", { chatMessageId });
    }
    this.requestChatMessage = requestChatMessage!;
  }

  static override DEFAULT_OPTIONS = {
    id: `resistance-request-respond-{id}`,
    tag: "form",
    classes: [systemId, "form", "roll-dialog", "resistance-roll-dialog"],
    form: {
      handler: RespondToResistanceRequestDialogV2.onSubmit,
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
      title: "RQG.Dialog.ResistanceRoll.Title",
      resizable: false,
    },
  };

  static override PARTS = {
    header: { template: templatePaths.rollHeader },
    form: { template: templatePaths.respondToResistanceRequestDialogV2, scrollable: [""] },
    footer: { template: templatePaths.rollFooter },
  };

  private static resolveTarget(requestChatMessage: ResistanceRequestChatMessage): {
    actor: RqgActor | undefined;
    token: TokenDocument | undefined;
  } {
    const tokenOrActor = fromUuidSync(requestChatMessage.system.targetTokenOrActorUuid) as
      TokenDocument | RqgActor | undefined;
    return {
      actor: (tokenOrActor instanceof TokenDocument ? tokenOrActor.actor : tokenOrActor) as
        RqgActor | undefined,
      token: tokenOrActor instanceof TokenDocument ? tokenOrActor : undefined,
    };
  }

  // Takes the resolved actor so callers look the target up once.
  private static resolveActive(
    actor: RqgActor | undefined,
    activeCharacteristics: string,
  ): { value: number; label: string } {
    const names = decodeCharacteristics(activeCharacteristics);
    if (!actor || names.length === 0) {
      return { value: 0, label: "" };
    }
    return {
      value: names.reduce((sum, name) => sum + resolveCharacteristicValue(actor, name), 0),
      label: names.map((name) => resolveCharacteristicLabel(name)).join(" + "),
    };
  }

  override async _prepareContext(): Promise<RespondToResistanceRequestDialogContext> {
    const formData = ((this.element &&
      new foundry.applications.ux.FormDataExtended(this.form!, {}).object) ??
      {}) as RespondToResistanceRequestDialogFormData;

    const { actor, token } = RespondToResistanceRequestDialogV2.resolveTarget(
      this.requestChatMessage,
    );
    const active = RespondToResistanceRequestDialogV2.resolveActive(
      actor,
      this.requestChatMessage.system.activeCharacteristics,
    );
    this.activeValue = active.value;
    this.passiveValue = this.requestChatMessage.system.passiveValue;

    // Augment/Meditate are the roller's own choices; only Other is seeded from the request.
    formData.augmentModifier ??= "0";
    formData.meditateModifier ??= "0";
    formData.otherModifier ??= String(this.requestChatMessage.system.otherModifier ?? 0);
    formData.otherModifierDescription ??=
      this.requestChatMessage.system.otherModifierDescription ||
      localize("RQG.Dialog.Common.OtherModifier");
    formData.chatMessageUuid ??= this.requestChatMessage.uuid ?? "";

    const speaker = getSpeakerCompat({ actor: actor, token: token });
    const passiveLabel = this.requestChatMessage.system.passiveLabel;

    return {
      formData: formData,
      speakerName: getSpeakerDisplayName(speaker),
      activeLabel: active.label,
      passiveLabel: passiveLabel,
      augmentOptions: augmentOptions,
      meditateOptions: meditateOptions,

      // RollHeader
      rollType: localize("RQG.Roll.ResistanceRoll.Title"),
      rollName: `${active.label || "?"} ${localize("RQG.Roll.ResistanceRoll.Vs")} ${passiveLabel || "?"}`,
      baseChance: "",

      // RollFooter
      totalChance: RespondToResistanceRequestDialogV2.computeTotalChance(
        this.activeValue,
        this.passiveValue,
        formData,
      ),
      rollMode: this.rollMode,
      rollModes: getConfiguredRollModeOptions(),
    };
  }

  private static computeTotalChance(
    activeValue: number,
    passiveValue: number,
    formData: RespondToResistanceRequestDialogFormData,
  ): number {
    return computeResistanceTargetChance(activeValue, passiveValue, [
      Number(formData.augmentModifier),
      Number(formData.meditateModifier),
      Number(formData.otherModifier),
    ]);
  }

  private updateLivePreview(): void {
    const formData = new foundry.applications.ux.FormDataExtended(this.element, {})
      .object as RespondToResistanceRequestDialogFormData;
    this.updateTotalChanceDisplay(
      RespondToResistanceRequestDialogV2.computeTotalChance(
        this.activeValue,
        this.passiveValue,
        formData,
      ),
    );
  }

  private static async onSubmit(
    event: SubmitEvent | Event,
    form: HTMLFormElement,
    formData: foundry.applications.ux.FormDataExtended,
  ): Promise<void> {
    const formDataObject = formData.object as RespondToResistanceRequestDialogFormData;

    // @ts-expect-error close - close immediately instead of waiting for the roll animation
    this.close();

    const requestChatMessage = (await fromUuid(formDataObject.chatMessageUuid)) as
      ResistanceRequestChatMessage | undefined;
    if (!requestChatMessage) {
      logger.throw("Resistance request chat message not found", formDataObject);
    }

    const { actor, token } = RespondToResistanceRequestDialogV2.resolveTarget(requestChatMessage!);
    const active = RespondToResistanceRequestDialogV2.resolveActive(
      actor,
      requestChatMessage!.system.activeCharacteristics,
    );
    if (!actor || !active.label) {
      ui.notifications?.error("Could not find who this resistance request is for.");
      return;
    }

    const options: ResistanceRollOptions = {
      activeValue: active.value,
      activeLabel: active.label,
      passiveValue: requestChatMessage!.system.passiveValue,
      passiveLabel: requestChatMessage!.system.passiveLabel,
      passiveActorName: requestChatMessage!.system.passiveActorName,
      modifiers: buildResistanceModifiers(
        formDataObject.augmentModifier,
        formDataObject.meditateModifier,
        formDataObject.otherModifier,
        formDataObject.otherModifierDescription,
      ),
      speaker: getSpeakerCompat({ actor: actor, token: token }),
      rollMode: resolveRollModeFromForm(form),
    };

    const roll = new ResistanceRoll(undefined, {}, options);
    await roll.evaluate();

    if (game.dice3d) {
      await game.dice3d.showForRoll(roll, game.user, true, null, false);
    }

    const messageData = requestChatMessage!.toObject();
    foundry.utils.mergeObject(
      messageData,
      { system: { state: "Rolled", resistanceRoll: roll.toJSON() } },
      { overwrite: true },
    );
    messageData.content = await foundry.applications.handlebars.renderTemplate(
      templatePaths.resistanceRequestChatMessage,
      messageData.system,
    );

    activateChatTab();
    await updateChatMessage(requestChatMessage!, messageData);

    // Only POW earns an experience check from a resistance roll.
    if (
      isDocumentSubType<CharacterActor>(actor, ActorTypeEnum.Character) &&
      roll.successLevel != null &&
      decodeCharacteristics(requestChatMessage!.system.activeCharacteristics).includes("power")
    ) {
      await actor.checkExperience("power", roll.successLevel);
    }
  }
}
