import { systemId } from "../../system/config";
import { templatePaths } from "../../system/load-handlebars-templates";
import type {
  RespondToResistanceRequestDialogContext,
  RespondToResistanceRequestDialogFormData,
} from "./respond-to-resistance-request-dialog-data.types.ts";
import {
  getSpeakerDisplayName,
  localize,
  normalizeOtherModifierDescriptionForRoll,
} from "../../system/util";
import type { RqgActor } from "@actors/rqg-actor.ts";
import type {
  Modifier,
  ResistanceRollOptions,
} from "../../rolls/resistance-roll/resistance-roll.types";
import { ResistanceRoll } from "../../rolls/resistance-roll/resistance-roll";
import { computeResistanceTargetChance } from "../../rolls/resistance-roll/resistance-roll-formula.ts";
import {
  augmentOptions,
  buildResistanceChanceBreakdown,
  buildResistanceModifiers,
  creditResistanceRollPowExperience,
  decodeCharacteristics,
  initialResistanceRollMode,
  meditateOptions,
  RESISTANCE_REQUEST_ROLL_MODES,
  resolveCharacteristicLabel,
  resolveCharacteristicValue,
  resolveResistanceRequestVisibility,
} from "./resistance-roll-shared.ts";
import { RqgInteractiveRollApplicationBase } from "../app-parts/rqg-interactive-roll-application-base";
import { getConfiguredRollModeOptions, resolveRollModeFromForm } from "../app-parts/roll-mode";
import { getSpeakerCompat } from "../../system/fvtt-type-compat";
import type { ResistanceRequestChatMessage } from "../../chat/data-model/resistance-request-chat-message.types.ts";
import { RqgLogger } from "../../system/logging/rqg-logger";
import { answerResistanceRequest } from "../../chat/resistance-request-handlers";
import { AbilitySuccessLevelEnum } from "../../rolls/ability-roll/ability-roll.defs";

const logger = new RqgLogger("RespondToResistanceRequestDialogV2");

const RESPOND_DIALOG_ID_PREFIX = "resistance-request-respond";

type ResolvedRequestSides = {
  activeValue: number;
  activeLabel: string;
  passiveValue: number;
  passiveLabel: string;
  /** The recipient supplies the passive side, so their own modifiers work against the active side. */
  rollerIsPassive: boolean;
  opposingActorName?: string | undefined;
};

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
  private sides: ResolvedRequestSides;

  constructor(
    chatMessageId: string,
    options?: Partial<foundry.applications.types.ApplicationConfiguration>,
  ) {
    super({
      ...options,
      id: RespondToResistanceRequestDialogV2.idForChatMessage(chatMessageId),
    });
    const requestChatMessage = game.messages?.get(chatMessageId ?? "") as
      ResistanceRequestChatMessage | undefined;
    if (!requestChatMessage) {
      logger.throw("No resistance request chat message found", { chatMessageId });
    }
    this.requestChatMessage = requestChatMessage!;
    this.rollMode = initialResistanceRollMode(this.requestChatMessage.system.rollMode);
    this.sides = RespondToResistanceRequestDialogV2.resolveSides(
      this.requestChatMessage,
      RespondToResistanceRequestDialogV2.resolveTarget(this.requestChatMessage).actor,
    );
  }

  /** The window id a request card's dialog gets - one per card, so clicking twice can't stack two. */
  static idForChatMessage(chatMessageId: string): string {
    return `${RESPOND_DIALOG_ID_PREFIX}-${chatMessageId}`;
  }

  static override DEFAULT_OPTIONS = {
    id: `${RESPOND_DIALOG_ID_PREFIX}-{id}`,
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
  private static resolveRollerSide(
    actor: RqgActor | undefined,
    characteristicsEncoded: string,
  ): { value: number; label: string } {
    const names = decodeCharacteristics(characteristicsEncoded);
    if (!actor || names.length === 0) {
      return { value: 0, label: "" };
    }
    return {
      value: names.reduce((sum, name) => sum + resolveCharacteristicValue(actor, name), 0),
      label: names.map((name) => resolveCharacteristicLabel(name)).join(" + "),
    };
  }

  /** The recipient's side is read live off their sheet; the opposing side was frozen when sent. */
  private static resolveSides(
    requestChatMessage: ResistanceRequestChatMessage,
    actor: RqgActor | undefined,
  ): ResolvedRequestSides {
    const system = requestChatMessage.system;
    const rollerIsPassive = system.rollerSide === "passive";
    const roller = RespondToResistanceRequestDialogV2.resolveRollerSide(
      actor,
      rollerIsPassive ? system.passiveCharacteristics : system.activeCharacteristics,
    );

    return rollerIsPassive
      ? {
          activeValue: system.activeValue,
          activeLabel: system.activeLabel,
          passiveValue: roller.value,
          passiveLabel: roller.label,
          rollerIsPassive: true,
          opposingActorName: system.activeActorName,
        }
      : {
          activeValue: roller.value,
          activeLabel: roller.label,
          passiveValue: system.passiveValue,
          passiveLabel: system.passiveLabel,
          rollerIsPassive: false,
          opposingActorName: system.passiveActorName,
        };
  }

  /**
   * The recipient's Augment/Meditate/Other always strengthen the recipient, so they subtract from
   * the active side's chance when the recipient is the one resisting. The request's own modifier
   * always belongs to the active side.
   */
  private static buildModifiers(
    formData: RespondToResistanceRequestDialogFormData,
    sides: ResolvedRequestSides,
    requestChatMessage: ResistanceRequestChatMessage,
  ): Modifier[] {
    const rollerModifiers = buildResistanceModifiers(
      formData.augmentModifier,
      formData.meditateModifier,
      formData.otherModifier,
      formData.otherModifierDescription,
    );
    if (!sides.rollerIsPassive) {
      return rollerModifiers;
    }

    const requestModifier = Number(requestChatMessage.system.otherModifier) || 0;
    return [
      ...rollerModifiers.map((modifier) => ({ ...modifier, value: -modifier.value })),
      ...(requestModifier
        ? [
            {
              value: requestModifier,
              description: normalizeOtherModifierDescriptionForRoll(
                requestChatMessage.system.otherModifierDescription ?? "",
              ),
            },
          ]
        : []),
    ];
  }

  /** The side's label, named with the actor it came from so both sides read alike. */
  private static describeSide(label: string, actorName: string | undefined): string {
    return label && actorName ? `${label} (${actorName})` : label;
  }

  override async _prepareContext(): Promise<RespondToResistanceRequestDialogContext> {
    const formData = ((this.element &&
      new foundry.applications.ux.FormDataExtended(this.form!, {}).object) ??
      {}) as RespondToResistanceRequestDialogFormData;

    const { actor, token } = RespondToResistanceRequestDialogV2.resolveTarget(
      this.requestChatMessage,
    );
    this.sides = RespondToResistanceRequestDialogV2.resolveSides(this.requestChatMessage, actor);

    // Augment/Meditate are the roller's own choices; Other is only seeded when it's theirs to use.
    formData.augmentModifier ??= "0";
    formData.meditateModifier ??= "0";
    formData.otherModifier ??= this.sides.rollerIsPassive
      ? "0"
      : String(this.requestChatMessage.system.otherModifier ?? 0);
    formData.otherModifierDescription ??=
      (this.sides.rollerIsPassive ? "" : this.requestChatMessage.system.otherModifierDescription) ||
      localize("RQG.Dialog.Common.OtherModifier");
    formData.chatMessageUuid ??= this.requestChatMessage.uuid ?? "";

    const speaker = getSpeakerCompat({ actor: actor, token: token });
    const opposingName = this.sides.opposingActorName;
    const rollerName = actor?.name ?? undefined;
    const activeLabel = RespondToResistanceRequestDialogV2.describeSide(
      this.sides.activeLabel,
      this.sides.rollerIsPassive ? opposingName : rollerName,
    );
    const passiveLabel = RespondToResistanceRequestDialogV2.describeSide(
      this.sides.passiveLabel,
      this.sides.rollerIsPassive ? rollerName : opposingName,
    );

    return {
      formData: formData,
      speakerName: getSpeakerDisplayName(speaker),
      activeLabel: activeLabel,
      passiveLabel: passiveLabel,
      rollerIsPassive: this.sides.rollerIsPassive,
      augmentOptions: augmentOptions,
      meditateOptions: meditateOptions,

      // RollHeader
      rollType: localize("RQG.Roll.ResistanceRoll.Title"),
      rollName:
        this.requestChatMessage.system.description ||
        `${this.sides.activeLabel || "?"} ${localize("RQG.Roll.ResistanceRoll.Vs")} ${this.sides.passiveLabel || "?"}`,
      baseChance: "",

      // RollFooter
      totalChance: this.computeTotalChance(formData),
      totalChanceTooltip: this.buildChanceBreakdown(formData),
      rollMode: this.rollMode,
      rollModes: getConfiguredRollModeOptions(RESISTANCE_REQUEST_ROLL_MODES),
    };
  }

  private buildChanceBreakdown(formData: RespondToResistanceRequestDialogFormData): string {
    return buildResistanceChanceBreakdown(
      { value: this.sides.activeValue, label: this.sides.activeLabel },
      { value: this.sides.passiveValue, label: this.sides.passiveLabel },
      RespondToResistanceRequestDialogV2.buildModifiers(
        formData,
        this.sides,
        this.requestChatMessage,
      ),
    );
  }

  private computeTotalChance(formData: RespondToResistanceRequestDialogFormData): number {
    return computeResistanceTargetChance(
      this.sides.activeValue,
      this.sides.passiveValue,
      RespondToResistanceRequestDialogV2.buildModifiers(
        formData,
        this.sides,
        this.requestChatMessage,
      ).map((modifier) => modifier.value),
    );
  }

  private updateLivePreview(): void {
    const formData = new foundry.applications.ux.FormDataExtended(this.element, {})
      .object as RespondToResistanceRequestDialogFormData;
    this.updateTotalChanceDisplay(this.computeTotalChance(formData));

    const targetChanceBox = this.element.querySelector<HTMLElement>("[data-target-chance-box]");
    if (targetChanceBox) {
      targetChanceBox.dataset["tooltip"] = this.buildChanceBreakdown(formData);
    }
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

    // The card may have been answered elsewhere while this dialog sat open - from the same card's
    // Accept, or by a GM on another client - and a roll now would overwrite that outcome.
    if (requestChatMessage!.system.state !== "Requested") {
      ui.notifications?.warn(localize("RQG.Notification.Warn.ResistanceRequestAlreadyAnswered"));
      return;
    }

    const { actor, token } = RespondToResistanceRequestDialogV2.resolveTarget(requestChatMessage!);
    const sides = RespondToResistanceRequestDialogV2.resolveSides(requestChatMessage!, actor);
    const rollerLabel = sides.rollerIsPassive ? sides.passiveLabel : sides.activeLabel;
    if (!actor || !rollerLabel) {
      ui.notifications?.error(localize("RQG.Notification.Error.ResistanceRequestTargetNotFound"));
      return;
    }

    // Hiding the button in the DOM isn't a permission check - match the Accept handler's.
    if (!game.user?.isGM && !actor.isOwner) {
      ui.notifications?.warn(localize("RQG.Notification.Warn.NotOwnerOfResistanceRequest"));
      return;
    }

    const rollMode = resolveRollModeFromForm(form);
    const options: ResistanceRollOptions = {
      activeValue: sides.activeValue,
      activeLabel: sides.activeLabel,
      passiveValue: sides.passiveValue,
      passiveLabel: sides.passiveLabel,
      passiveActorName: sides.rollerIsPassive ? undefined : sides.opposingActorName,
      modifiers: RespondToResistanceRequestDialogV2.buildModifiers(
        formDataObject,
        sides,
        requestChatMessage!,
      ),
      speaker: getSpeakerCompat({ actor: actor, token: token }),
      rollMode: rollMode,
    };

    const roll = new ResistanceRoll(undefined, {}, options);
    await roll.evaluate();

    // A combined cast card was already posted publicly, so re-whispering it now would only hide a
    // roll everyone has seen - it keeps the visibility it was created with.
    const { whisper, blind } = requestChatMessage!.system.castRoll
      ? {
          whisper: (requestChatMessage!.whisper ?? []) as unknown as string[],
          blind: !!requestChatMessage!.blind,
        }
      : resolveResistanceRequestVisibility(rollMode, actor);

    if (game.dice3d) {
      await game.dice3d.showForRoll(roll, game.user, true, whisper.length ? whisper : null, blind);
    }

    // The roll is the active side's, so its success level says whether the *caster* got through -
    // "Failure" on a resister's card means they held. Spell it out rather than leave the badge to
    // be read either way.
    const activeOvercame =
      roll.successLevel != null && roll.successLevel <= AbilitySuccessLevelEnum.Success;
    const targetName = actor.name ?? "";
    // A hidden cast withholds the caster's name, so fall back to phrasing that doesn't need it.
    const casterName = sides.rollerIsPassive ? sides.opposingActorName : undefined;
    let outcomeDescription = "";
    if (requestChatMessage!.system.isSpellCast) {
      outcomeDescription = casterName
        ? localize(
            activeOvercame
              ? "RQG.ChatMessage.ResistanceRequest.SpellOvercame"
              : "RQG.ChatMessage.ResistanceRequest.SpellNotOvercame",
            { casterName: casterName, targetName: targetName },
          )
        : localize(
            activeOvercame
              ? "RQG.ChatMessage.ResistanceRequest.SpellTakesEffect"
              : "RQG.ChatMessage.ResistanceRequest.SpellResisted",
            { targetName: targetName },
          );
    }

    // A spell that lands is felt, so the target learns what it was. One they turned aside stays
    // a mystery, so only an overcome reveals it.
    await answerResistanceRequest(
      requestChatMessage!,
      {
        state: "Rolled",
        resistanceRoll: roll.toJSON(),
        outcomeDescription: outcomeDescription,
      },
      { revealSpell: activeOvercame, whisper: whisper, blind: blind },
    );

    await creditResistanceRollPowExperience(
      actor,
      requestChatMessage!.system.activeCharacteristics,
      requestChatMessage!.system.passiveCharacteristics,
      sides.rollerIsPassive,
      roll,
    );
  }
}
