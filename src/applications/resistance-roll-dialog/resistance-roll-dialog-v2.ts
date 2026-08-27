import { systemId } from "../../system/config";
import { templatePaths } from "../../system/load-handlebars-templates";
import type {
  ResistanceRollDialogContext,
  ResistanceRollDialogFormData,
  ResistanceRollDialogPrefill,
  ResistanceRollSidePrefill,
} from "./resistance-roll-dialog-data.types.ts";
import { MANUAL_SOURCE_VALUE } from "./resistance-roll-dialog-data.types.ts";
import { getSpeakerDisplayName, isDocumentSubType, localize, RqgError } from "../../system/util";
import type { RqgActor } from "@actors/rqg-actor.ts";
import { ActorTypeEnum, type CharacterActor } from "../../data-model/actor-data/rqg-actor-data";
import type { ResistanceRollOptions } from "../../rolls/resistance-roll/resistance-roll.types";
import { ResistanceRoll } from "../../rolls/resistance-roll/resistance-roll";
import { computeResistanceTargetChance } from "../../rolls/resistance-roll/resistance-roll-formula.ts";
import {
  augmentOptions,
  buildResistanceModifiers,
  decodeCharacteristics,
  encodeCharacteristics,
  getCharacteristicOptions,
  getTokenOrActorOptions,
  meditateOptions,
  resolveActorFromUuid,
  resolveCharacteristicSide,
} from "./resistance-roll-shared.ts";
import { getConfiguredRollModeOptions, resolveRollModeFromForm } from "../app-parts/roll-mode";
import { RqgInteractiveRollApplicationBase } from "../app-parts/rqg-interactive-roll-application-base";
import { getSpeakerCompat } from "../../system/fvtt-type-compat";

type Side = "active" | "passive";

type SideFields = {
  tokenOrActorUuid: string;
  characteristics: string;
  manualLabel: string;
  manualValue: number;
};

// The four fields making up a side are always named `${side}TokenOrActorUuid`,
// `${side}Characteristics`, `${side}ManualLabel`, `${side}ManualValue` - read/write them via that
// naming convention instead of branching on `side` per field.
function getSideFields(formData: ResistanceRollDialogFormData, side: Side): SideFields {
  return {
    tokenOrActorUuid: formData[`${side}TokenOrActorUuid`],
    characteristics: formData[`${side}Characteristics`],
    manualLabel: formData[`${side}ManualLabel`],
    manualValue: formData[`${side}ManualValue`],
  };
}

function setSideFields(
  formData: ResistanceRollDialogFormData,
  side: Side,
  fields: Partial<SideFields>,
): void {
  if (fields.tokenOrActorUuid !== undefined) {
    formData[`${side}TokenOrActorUuid`] = fields.tokenOrActorUuid;
  }
  if (fields.characteristics !== undefined) {
    formData[`${side}Characteristics`] = fields.characteristics;
  }
  if (fields.manualLabel !== undefined) {
    formData[`${side}ManualLabel`] = fields.manualLabel;
  }
  if (fields.manualValue !== undefined) {
    formData[`${side}ManualValue`] = fields.manualValue;
  }
}

function applyPrefill(
  formData: ResistanceRollDialogFormData,
  side: Side,
  prefill: ResistanceRollSidePrefill | undefined,
): void {
  if (!prefill) {
    return;
  }
  if (prefill.source === "manual") {
    setSideFields(formData, side, {
      tokenOrActorUuid: MANUAL_SOURCE_VALUE,
      manualLabel: prefill.label,
      manualValue: prefill.value,
    });
    return;
  }
  setSideFields(formData, side, {
    tokenOrActorUuid: prefill.tokenOrActorUuid,
    characteristics: encodeCharacteristics(prefill.characteristicNames),
  });
}

export class ResistanceRollDialogV2 extends RqgInteractiveRollApplicationBase {
  protected override getLivePreviewFormBehaviorConfig() {
    return {
      submitButtonSelectorForBlurGuard: "button[data-ability-roll]",
      updateLivePreview: () => this.updateLivePreview(),
    };
  }

  private actor: RqgActor;
  private token: TokenDocument | null | undefined;
  private prefill: ResistanceRollDialogPrefill | undefined;
  // Applied once on the first _prepareContext only - _prepareContext reruns on every form change
  // (RqgInteractiveRollApplicationBase re-renders on change), and re-applying the prefill on every
  // one of those reruns would stomp over whatever the user just picked.
  private prefillApplied = false;

  constructor(
    actor: RqgActor,
    token?: TokenDocument | null,
    prefill?: ResistanceRollDialogPrefill,
    options?: Partial<foundry.applications.types.ApplicationConfiguration>,
  ) {
    super(options);
    this.actor = actor;
    this.token = token;
    this.prefill = prefill;
  }

  static override DEFAULT_OPTIONS = {
    id: `resistance-{id}`,
    tag: "form",
    classes: [systemId, "form", "roll-dialog", "resistance-roll-dialog"],
    form: {
      handler: ResistanceRollDialogV2.onSubmit,
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
    form: { template: templatePaths.resistanceRollDialogV2, scrollable: [""] },
    footer: { template: templatePaths.rollFooter },
  };

  override async _prepareContext(): Promise<ResistanceRollDialogContext> {
    const formData = ((this.element &&
      new foundry.applications.ux.FormDataExtended(this.form!, {}).object) ??
      {}) as ResistanceRollDialogFormData;

    const selfUuid = this.token?.uuid || this.actor.uuid || "";
    const tokenOrActorOptions = getTokenOrActorOptions(
      selfUuid,
      this.token?.name ?? this.actor.name ?? "",
      this.actor,
    );
    const defaultTargetUuid =
      game.user?.targets.size === 1 ? (game.user.targets.first()?.document?.uuid ?? "") : "";

    formData.activeTokenOrActorUuid ??= selfUuid;
    formData.activeCharacteristics ??= "";
    formData.activeManualLabel ??= "";
    formData.activeManualValue ??= 0;

    formData.passiveTokenOrActorUuid ??= defaultTargetUuid || MANUAL_SOURCE_VALUE;
    formData.passiveCharacteristics ??= "";
    formData.passiveManualLabel ??= "";
    formData.passiveManualValue ??= 0;

    if (!this.prefillApplied) {
      applyPrefill(formData, "active", this.prefill?.active);
      applyPrefill(formData, "passive", this.prefill?.passive);
      this.prefillApplied = true;
    }

    formData.augmentModifier ??= "0";
    formData.meditateModifier ??= "0";
    formData.otherModifier ??= "0";
    formData.otherModifierDescription ??= localize("RQG.Dialog.Common.OtherModifier");
    formData.actorUuid ??= this.actor.uuid ?? "";
    formData.tokenUuid ??= this.token?.uuid ?? "";

    const speaker = getSpeakerCompat({ actor: this.actor, token: this.token });
    const totalChance = ResistanceRollDialogV2.computeTotalChance(formData);
    const active = ResistanceRollDialogV2.resolveSide(formData, "active");
    const passive = ResistanceRollDialogV2.resolveSide(formData, "passive");

    return {
      formData: formData,

      speakerName: getSpeakerDisplayName(speaker),
      activeTokenOrActorOptions: tokenOrActorOptions,
      passiveTokenOrActorOptions: tokenOrActorOptions,
      characteristicOptions: getCharacteristicOptions(),
      augmentOptions: augmentOptions,
      meditateOptions: meditateOptions,

      // RollHeader
      rollType: localize("RQG.Roll.ResistanceRoll.Title"),
      rollName:
        this.prefill?.description ??
        `${active.label || "?"} ${localize("RQG.Roll.ResistanceRoll.Vs")} ${passive.label || "?"}`,
      baseChance: "",

      // RollFooter
      totalChance: totalChance,
      rollMode: this.rollMode,
      rollModes: getConfiguredRollModeOptions(),
    };
  }

  private static resolveSide(
    formData: ResistanceRollDialogFormData,
    side: Side,
  ): { value: number; label: string; actorName?: string } {
    const fields = getSideFields(formData, side);
    const fallbackLabel = localize(
      side === "active" ? "RQG.Dialog.ResistanceRoll.Active" : "RQG.Dialog.ResistanceRoll.Passive",
    );
    return resolveCharacteristicSide(
      fields.tokenOrActorUuid,
      fields.characteristics,
      fields.manualLabel,
      fields.manualValue,
      fallbackLabel,
    );
  }

  private static computeTotalChance(formData: ResistanceRollDialogFormData): number {
    const active = ResistanceRollDialogV2.resolveSide(formData, "active");
    const passive = ResistanceRollDialogV2.resolveSide(formData, "passive");
    return computeResistanceTargetChance(active.value, passive.value, [
      Number(formData.augmentModifier),
      Number(formData.meditateModifier),
      Number(formData.otherModifier),
    ]);
  }

  private updateLivePreview(): void {
    const formData = new foundry.applications.ux.FormDataExtended(this.element, {})
      .object as ResistanceRollDialogFormData;
    this.updateTotalChanceDisplay(ResistanceRollDialogV2.computeTotalChance(formData));
  }

  private static async onSubmit(
    event: SubmitEvent | Event,
    form: HTMLFormElement,
    formData: foundry.applications.ux.FormDataExtended,
  ): Promise<void> {
    const formDataObject = formData.object as ResistanceRollDialogFormData;

    const rollMode = resolveRollModeFromForm(form);

    // Independent lookups from unrelated uuids - resolved concurrently.
    const [actor, token] = (await Promise.all([
      fromUuid(formDataObject.actorUuid),
      formDataObject.tokenUuid ? fromUuid(formDataObject.tokenUuid) : undefined,
    ])) as [RqgActor | undefined, TokenDocument | undefined];
    if (!actor) {
      ui.notifications?.error("Could not find an actor to roll a resistance roll for.");
      return;
    }

    const active = ResistanceRollDialogV2.resolveSide(formDataObject, "active");
    const passive = ResistanceRollDialogV2.resolveSide(formDataObject, "passive");
    const isSideResolved = (uuid: string, label: string) => uuid === MANUAL_SOURCE_VALUE || !!label;
    if (
      !isSideResolved(formDataObject.activeTokenOrActorUuid, active.label) ||
      !isSideResolved(formDataObject.passiveTokenOrActorUuid, passive.label)
    ) {
      ui.notifications?.error("Pick an Active and a Passive value to roll a resistance roll.");
      return;
    }

    const options: ResistanceRollOptions = {
      activeValue: active.value,
      activeLabel: active.label,
      passiveValue: passive.value,
      passiveLabel: passive.label,
      passiveActorName: passive.actorName,
      modifiers: buildResistanceModifiers(
        formDataObject.augmentModifier,
        formDataObject.meditateModifier,
        formDataObject.otherModifier,
        formDataObject.otherModifierDescription,
      ),
      speaker: getSpeakerCompat({ actor, token }),
      rollMode: rollMode,
    };

    const roll = await ResistanceRoll.rollAndShow(options);
    if (roll.successLevel == null) {
      throw new RqgError("Evaluated ResistanceRoll didn't give successLevel");
    }

    // Award POW-experience (or any other characteristic-use bookkeeping) to whichever actor's
    // characteristic(s) were actually used as the active side, not necessarily the dialog's own
    // actor - both characteristics of a combo (e.g. Knockback's STR+SIZ) get checked.
    const activeCharacteristicNames = decodeCharacteristics(formDataObject.activeCharacteristics);
    if (formDataObject.activeTokenOrActorUuid !== MANUAL_SOURCE_VALUE) {
      const activeActor = resolveActorFromUuid(formDataObject.activeTokenOrActorUuid);
      if (activeActor && isDocumentSubType<CharacterActor>(activeActor, ActorTypeEnum.Character)) {
        for (const characteristicName of activeCharacteristicNames) {
          await activeActor.checkExperience(characteristicName, roll.successLevel);
        }
      }
    }
  }
}
