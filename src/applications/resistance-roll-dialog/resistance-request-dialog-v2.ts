import { systemId } from "../../system/config";
import { templatePaths } from "../../system/load-handlebars-templates";
import type {
  ResistanceRequestDialogContext,
  ResistanceRequestDialogFormData,
  ResistanceRequestSeed,
} from "./resistance-request-dialog-data.types.ts";
import { MANUAL_SOURCE_VALUE } from "./resistance-roll-dialog-data.types.ts";
import { localize } from "../../system/util";
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
} from "./resistance-roll-shared.ts";
import { computeResistanceTargetChance } from "../../rolls/resistance-roll/resistance-roll-formula.ts";
import { RqgInteractiveRollApplicationBase } from "../app-parts/rqg-interactive-roll-application-base";
import { getConfiguredRollModeOptions, resolveRollModeFromForm } from "../app-parts/roll-mode";
import { createResistanceRequest } from "./create-resistance-request.ts";
import { resistanceRequestRollerSide } from "../../chat/data-model/resistance-request-chat-message.defs.ts";
import type { ResistanceRequestRollerSide } from "../../chat/data-model/resistance-request-chat-message.types.ts";

type ResolvedSide = { value: number; label: string; actorName?: string | undefined };

/**
 * One side's picker. The recipient's side keeps its player-owned-only filter and has no Manual
 * entry; the frozen side lists everything plus Manual. A selection outside the scanned options
 * (a token on another scene, say) is forced in so it survives a re-render.
 */
function buildSideOptions(
  selectedUuid: string,
  isFrozenSide: boolean,
  baseOptions: SelectOptionData<string>[],
): SelectOptionData<string>[] {
  const selected =
    selectedUuid && selectedUuid !== MANUAL_SOURCE_VALUE
      ? (fromUuidSync(selectedUuid) as TokenDocument | RqgActor | undefined)
      : undefined;
  const selectedActor = (selected instanceof TokenDocument ? selected.actor : selected) as
    RqgActor | undefined;
  const canForce = !!selected && (isFrozenSide || !!selectedActor?.hasPlayerOwner);
  return getTokenOrActorOptions(
    canForce ? selectedUuid : "",
    canForce ? (selected?.name ?? "") : "",
    canForce ? selectedActor : undefined,
    isFrozenSide,
    baseOptions,
  );
}

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
  /** Set by the swap button, applied on the next render against the live form values. */
  private pendingSwap = false;

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
    actions: {
      swapSides: ResistanceRequestDialogV2.onSwapSidesAction,
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

  private static rollerIsPassive(formData: ResistanceRequestDialogFormData): boolean {
    return formData.rollerSide === "passive";
  }

  /** The recipient's picker: player-owned actors only (a GM owns every token) and no Manual entry. */
  private static rollerUuid(formData: ResistanceRequestDialogFormData): string {
    return ResistanceRequestDialogV2.rollerIsPassive(formData)
      ? formData.passiveTokenOrActorUuid
      : formData.activeTokenOrActorUuid;
  }

  /** The side snapshotted when the request is sent - the only one that may be Manual. */
  private static frozenUuid(formData: ResistanceRequestDialogFormData): string {
    return ResistanceRequestDialogV2.rollerIsPassive(formData)
      ? formData.activeTokenOrActorUuid
      : formData.passiveTokenOrActorUuid;
  }

  /**
   * Exchange the two sides, keeping the same actor as the recipient - so swapping a PC from active
   * to passive puts the hazard on the attacking side without handing the dice to someone else.
   */
  private static async onSwapSidesAction(this: ResistanceRequestDialogV2): Promise<void> {
    this.pendingSwap = true;
    await this.render();
  }

  /** Manual isn't a uuid, so it never reaches fromUuidSync. */
  private static sideHasPlayerOwner(sideUuid: string): boolean {
    return (
      !!sideUuid &&
      sideUuid !== MANUAL_SOURCE_VALUE &&
      !!resolveActorFromUuid(sideUuid)?.hasPlayerOwner
    );
  }

  /** Move each side's whole entry across, so a swap keeps its characteristic and Manual value. */
  private static swapSides(formData: ResistanceRequestDialogFormData): void {
    const active = {
      uuid: formData.activeTokenOrActorUuid,
      characteristics: formData.activeCharacteristics,
      manualName: formData.activeManualName,
      manualLabel: formData.activeManualLabel,
      manualValue: formData.activeManualValue,
    };
    formData.activeTokenOrActorUuid = formData.passiveTokenOrActorUuid;
    formData.activeCharacteristics = formData.passiveCharacteristics;
    formData.activeManualName = formData.passiveManualName;
    formData.activeManualLabel = formData.passiveManualLabel;
    formData.activeManualValue = formData.passiveManualValue;
    formData.passiveTokenOrActorUuid = active.uuid;
    formData.passiveCharacteristics = active.characteristics;
    formData.passiveManualName = active.manualName;
    formData.passiveManualLabel = active.manualLabel;
    formData.passiveManualValue = active.manualValue;
  }

  /**
   * "Whenever possible, let the player be the one to make the roll, whether they are the active
   * side or the passive side" - so start on whichever seeded side a player owns.
   */
  private initialRollerSide(): ResistanceRequestRollerSide {
    const activeIsPlayerOwned = ResistanceRequestDialogV2.sideHasPlayerOwner(
      this.seed.activeUuid ?? "",
    );
    const passiveIsPlayerOwned = ResistanceRequestDialogV2.sideHasPlayerOwner(
      this.seed.passiveUuid ?? "",
    );
    return !activeIsPlayerOwned && passiveIsPlayerOwned ? "passive" : "active";
  }

  private static resolveSides(formData: ResistanceRequestDialogFormData): {
    active: ResolvedSide;
    passive: ResolvedSide;
  } {
    return {
      active: resolveCharacteristicSide(
        formData.activeTokenOrActorUuid,
        formData.activeCharacteristics,
        formData.activeManualLabel,
        formData.activeManualValue,
        "",
        formData.activeManualName,
      ),
      passive: resolveCharacteristicSide(
        formData.passiveTokenOrActorUuid,
        formData.passiveCharacteristics,
        formData.passiveManualLabel,
        formData.passiveManualValue,
        "",
        formData.passiveManualName,
      ),
    };
  }

  override async _prepareContext(): Promise<ResistanceRequestDialogContext> {
    const formData = ((this.element &&
      new foundry.applications.ux.FormDataExtended(this.form!, {}).object) ??
      {}) as ResistanceRequestDialogFormData;

    formData.rollerSide ??= this.initialRollerSide();
    let rollerIsPassive = ResistanceRequestDialogV2.rollerIsPassive(formData);

    const defaultTargetUuid =
      game.user?.targets.size === 1 ? (game.user.targets.first()?.document?.uuid ?? "") : "";
    const seededRollerUuid =
      (rollerIsPassive ? this.seed.passiveUuid : this.seed.activeUuid) || defaultTargetUuid || "";
    const seededFrozenUuid = (rollerIsPassive ? this.seed.activeUuid : this.seed.passiveUuid) ?? "";

    const rollerActorHasPlayerOwner = !!resolveActorFromUuid(seededRollerUuid)?.hasPlayerOwner;
    if (rollerIsPassive) {
      formData.passiveTokenOrActorUuid ??= rollerActorHasPlayerOwner ? seededRollerUuid : "";
      formData.activeTokenOrActorUuid ??= seededFrozenUuid || MANUAL_SOURCE_VALUE;
    } else {
      formData.activeTokenOrActorUuid ??= rollerActorHasPlayerOwner ? seededRollerUuid : "";
      formData.passiveTokenOrActorUuid ??= seededFrozenUuid || MANUAL_SOURCE_VALUE;
    }

    formData.activeCharacteristics ??= defaultCharacteristic;
    formData.passiveCharacteristics ??= defaultCharacteristic;
    formData.activeManualName ??= "";
    formData.activeManualLabel ??= "";
    formData.activeManualValue ??= 0;
    formData.passiveManualName ??= "";
    formData.passiveManualLabel ??= "";
    formData.passiveManualValue ??= 0;

    // The swap button exchanges the sides and follows the recipient across, so the same player
    // keeps the dice while the other side becomes the attacker.
    if (this.pendingSwap) {
      this.pendingSwap = false;
      ResistanceRequestDialogV2.swapSides(formData);
      formData.rollerSide = rollerIsPassive ? "active" : "passive";
      rollerIsPassive = !rollerIsPassive;
    }

    // Changing the toggle by hand can land the recipient on a Manual or NPC side, leaving nobody to
    // send to. Swapping keeps the player as the recipient and moves the frozen value across. Two
    // player-owned sides need no swap, so the toggle only moves the dice and leaves the odds alone.
    if (
      !ResistanceRequestDialogV2.sideHasPlayerOwner(
        ResistanceRequestDialogV2.rollerUuid(formData),
      ) &&
      ResistanceRequestDialogV2.sideHasPlayerOwner(ResistanceRequestDialogV2.frozenUuid(formData))
    ) {
      ResistanceRequestDialogV2.swapSides(formData);
    }

    // One token/actor scan, shared by both pickers.
    const baseTokenOrActorOptions = getBaseTokenOrActorOptions();
    const rollerOptions = buildSideOptions(
      ResistanceRequestDialogV2.rollerUuid(formData),
      false,
      filterToPlayerOwnedOptions(baseTokenOrActorOptions),
    );
    // The frozen side includes Manual (a GM-known POT etc.).
    const frozenOptions = buildSideOptions(
      ResistanceRequestDialogV2.frozenUuid(formData),
      true,
      baseTokenOrActorOptions,
    );

    // Neither side can take the request - fall back to any player-owned actor so Send can unlock.
    if (
      !rollerOptions.some(
        (option) => option.value === ResistanceRequestDialogV2.rollerUuid(formData),
      )
    ) {
      const fallback = rollerOptions[0]?.value ?? "";
      if (rollerIsPassive) {
        formData.passiveTokenOrActorUuid = fallback;
      } else {
        formData.activeTokenOrActorUuid = fallback;
      }
    }

    formData.otherModifier ??= "0";
    formData.otherModifierDescription ??= localize("RQG.Dialog.Common.OtherModifier");

    const { active, passive } = ResistanceRequestDialogV2.resolveSides(formData);

    return {
      formData: formData,
      activeTokenOrActorOptions: rollerIsPassive ? frozenOptions : rollerOptions,
      passiveTokenOrActorOptions: rollerIsPassive ? rollerOptions : frozenOptions,
      characteristicOptions: getCharacteristicOptions(),
      rollerSideOptions: resistanceRequestRollerSide.map((side) => ({
        value: side,
        label: `RQG.Dialog.ResistanceRequest.RollerSideOptions.${side}`,
      })),
      activeIsManual: rollerIsPassive && formData.activeTokenOrActorUuid === MANUAL_SOURCE_VALUE,
      passiveIsManual: !rollerIsPassive && formData.passiveTokenOrActorUuid === MANUAL_SOURCE_VALUE,

      // RollHeader
      rollType: localize("RQG.Dialog.ResistanceRequest.Title"),
      rollName: `${active.label || "?"} ${localize("RQG.Roll.ResistanceRoll.Vs")} ${passive.label || "?"}`,
      baseChance: "",

      totalChance: ResistanceRequestDialogV2.computeTotalChance(formData),
      totalChanceTooltip: ResistanceRequestDialogV2.buildChanceBreakdown(formData),
      canSendRequest: ResistanceRequestDialogV2.canSendRequest(formData),
      rollMode: this.rollMode,
      rollModes: getConfiguredRollModeOptions(RESISTANCE_REQUEST_ROLL_MODES),
    };
  }

  private static buildChanceBreakdown(formData: ResistanceRequestDialogFormData): string {
    const { active, passive } = ResistanceRequestDialogV2.resolveSides(formData);
    return buildResistanceChanceBreakdown(
      active,
      passive,
      buildResistanceModifiers("0", "0", formData.otherModifier, formData.otherModifierDescription),
    );
  }

  /** Both sides resolve to a value/label, and the recipient is a real actor - gates the Send button. */
  private static canSendRequest(formData: ResistanceRequestDialogFormData): boolean {
    const rollerUuid = ResistanceRequestDialogV2.rollerUuid(formData);
    if (!rollerUuid || rollerUuid === MANUAL_SOURCE_VALUE) {
      return false;
    }
    const { active, passive } = ResistanceRequestDialogV2.resolveSides(formData);
    return !!active.label && !!passive.label;
  }

  private static computeTotalChance(formData: ResistanceRequestDialogFormData): number {
    const { active, passive } = ResistanceRequestDialogV2.resolveSides(formData);
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

    // Send is disabled until valid; a stray submit just bails.
    if (!ResistanceRequestDialogV2.canSendRequest(formDataObject)) {
      return;
    }

    const rollerIsPassive = ResistanceRequestDialogV2.rollerIsPassive(formDataObject);
    const { active, passive } = ResistanceRequestDialogV2.resolveSides(formDataObject);
    const frozen = rollerIsPassive ? active : passive;
    const frozenUuid = rollerIsPassive
      ? formDataObject.activeTokenOrActorUuid
      : formDataObject.passiveTokenOrActorUuid;
    await createResistanceRequest({
      targetTokenOrActorUuid: ResistanceRequestDialogV2.rollerUuid(formDataObject),
      rollerSide: formDataObject.rollerSide,
      rollerCharacteristics: rollerIsPassive
        ? formDataObject.passiveCharacteristics
        : formDataObject.activeCharacteristics,
      frozenValue: frozen.value,
      frozenActorName: frozen.actorName,
      // A Manual value has no characteristic behind it, so it can never be a POW vs POW check.
      frozenCharacteristics:
        frozenUuid === MANUAL_SOURCE_VALUE
          ? ""
          : rollerIsPassive
            ? formDataObject.activeCharacteristics
            : formDataObject.passiveCharacteristics,
      frozenTokenOrActorUuid: frozenUuid === MANUAL_SOURCE_VALUE ? undefined : frozenUuid,
      activeLabel: active.label,
      passiveLabel: passive.label,
      otherModifier: Number(formDataObject.otherModifier) || 0,
      otherModifierDescription: formDataObject.otherModifierDescription || undefined,
      rollMode: resolveRollModeFromForm(form),
      // Declining to resist is only the resisting side's to offer - an active roller has nothing
      // to accept.
      allowVoluntaryAccept: rollerIsPassive,
    });
  }
}
