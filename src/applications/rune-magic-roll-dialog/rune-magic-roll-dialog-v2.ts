import type { RqgActor } from "@actors/rqg-actor.ts";
import { ActorTypeEnum, type CharacterActor } from "../../data-model/actor-data/rqg-actor-data.ts";
import { systemId } from "../../system/config";
import { templatePaths } from "../../system/load-handlebars-templates";
import {
  assertDocumentSubType,
  getSpeakerDisplayName,
  localize,
  normalizeOtherModifierDescriptionForRoll,
} from "../../system/util";
import { getSpeakerCompat } from "../../system/fvtt-type-compat";
import { RqgLogger } from "../../system/logging/rqg-logger";
import { RqgItem } from "@items/rqg-item.ts";
import type { RuneMagicRollImmediateOptions } from "../../rolls/rune-magic-roll/rune-magic-roll.types";
import type {
  RuneMagicRollDialogContext,
  RuneMagicRollDialogFormData,
} from "./rune-magic-roll-dialog-data.types.ts";
import type { PartialAbilityItem } from "../ability-roll-dialog/ability-roll-dialog-data.types.ts";
import { ItemTypeEnum } from "@item-model/item-types.ts";
import type { RuneMagicItem } from "@item-model/rune-magic-data-model.ts";
import {
  getConfiguredRollModeOptions,
  getDefaultRollMode,
  getSelectedRollMode,
} from "../app-parts/roll-mode";
import { RqgInteractiveRollApplicationBase } from "../app-parts/rqg-interactive-roll-application-base";
import {
  applySpellCastTargetNote,
  buildSpellCastTargetNote,
} from "../app-parts/spell-cast-target-note";
import {
  AUTO_MAGIC_POINT_SOURCE,
  getAlliedBondActor,
  getMagicPointSourceOptions,
} from "../../system/magic-point-source";
import { getRunePointSourceOptions, SELF_RUNE_POINT_SOURCE } from "../../system/rune-point-source";

const logger = new RqgLogger("RuneMagicRollDialogV2");

export class RuneMagicRollDialogV2 extends RqgInteractiveRollApplicationBase {
  protected override watchesUserTargets = true;

  protected override onUserTargetsChanged(): void {
    applySpellCastTargetNote(
      this.element,
      buildSpellCastTargetNote(this.spellItem.system.resistedBy),
    );
  }

  protected override getLivePreviewFormBehaviorConfig() {
    return {
      submitButtonSelectorForBlurGuard: "button[data-ability-roll]",
      updateLivePreview: () => this.updateLivePreview(),
    };
  }

  private computeTotalChance(formData: RuneMagicRollDialogFormData): number {
    const eligibleRunes = this.spellItem.system.getEligibleRunes(this.casterActor);
    const usedRune = eligibleRunes.find((r) => r.id === formData.usedRuneId);
    return this.spellItem.system.getCastChance(usedRune, [
      { value: formData.augmentModifier },
      { value: formData.meditateModifier },
      { value: formData.otherModifier },
    ]);
  }

  private static augmentOptions: SelectOptionData<number>[] = [
    { value: 0, label: "RQG.Dialog.Common.AugmentOptions.None" },
    { value: 50, label: "RQG.Dialog.Common.AugmentOptions.CriticalSuccess" },
    { value: 30, label: "RQG.Dialog.Common.AugmentOptions.SpecialSuccess" },
    { value: 20, label: "RQG.Dialog.Common.AugmentOptions.Success" },
    { value: -20, label: "RQG.Dialog.Common.AugmentOptions.Failure" },
    { value: -50, label: "RQG.Dialog.Common.AugmentOptions.Fumble" },
  ];

  private static meditateOptions: SelectOptionData<number>[] = [
    { value: 0, label: "RQG.Dialog.Common.MeditateOptions.None" },
    { value: 5, label: "RQG.Dialog.Common.MeditateOptions.1mr" },
    { value: 10, label: "RQG.Dialog.Common.MeditateOptions.2mr" },
    { value: 15, label: "RQG.Dialog.Common.MeditateOptions.5mr" },
    { value: 20, label: "RQG.Dialog.Common.MeditateOptions.25mr" },
    { value: 25, label: "RQG.Dialog.Common.MeditateOptions.50mr" },
  ];

  private static ritualOptions: SelectOptionData<number>[] = [
    { value: 30, label: "RQG.Dialog.Common.RitualOptions.30min" },
    { value: 35, label: "RQG.Dialog.Common.RitualOptions.1h" },
    { value: 40, label: "RQG.Dialog.Common.RitualOptions.5h" },
    { value: 45, label: "RQG.Dialog.Common.RitualOptions.10h" },
    { value: 50, label: "RQG.Dialog.Common.RitualOptions.1d" },
    { value: 55, label: "RQG.Dialog.Common.RitualOptions.2d" },
    { value: 60, label: "RQG.Dialog.Common.RitualOptions.1week" },
    { value: 65, label: "RQG.Dialog.Common.RitualOptions.2weeks" },
    { value: 70, label: "RQG.Dialog.Common.RitualOptions.4weeks" },
    { value: 75, label: "RQG.Dialog.Common.RitualOptions.1season" },
    { value: 80, label: "RQG.Dialog.Common.RitualOptions.1year" },
    { value: 85, label: "RQG.Dialog.Common.RitualOptions.2years" },
    { value: 90, label: "RQG.Dialog.Common.RitualOptions.5years" },
    { value: 95, label: "RQG.Dialog.Common.RitualOptions.10years" },
    { value: 100, label: "RQG.Dialog.Common.RitualOptions.20years" },
  ];

  private spellItem: RuneMagicItem;
  private casterActor: CharacterActor;
  private token: TokenDocument | null | undefined;

  /**
   * `casterActor` defaults to the spell's own owner - pass it explicitly when the spell is being
   * cast via an external spell source (#1002, e.g. an Allied Spirit bond partner's known spells)
   * so eligible Runes, chances, and the MP/RP source pickers all reflect the actual caster.
   */
  constructor(
    spellItem: RuneMagicItem,
    token?: TokenDocument | null,
    casterActor?: RqgActor,
    options?: Partial<foundry.applications.types.ApplicationConfiguration>,
  ) {
    super(options);
    const caster = casterActor ?? spellItem.parent;
    assertDocumentSubType<CharacterActor>(caster, ActorTypeEnum.Character);
    this.spellItem = spellItem;
    this.casterActor = caster;
    this.token = token;
  }

  static override DEFAULT_OPTIONS = {
    id: "rune-magic-{id}",
    tag: "form",
    classes: [systemId, "form", "roll-dialog", "rune-magic-roll-dialog"],
    form: {
      handler: RuneMagicRollDialogV2.onSubmit,
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
      icon: "fa-solid fa-dice",
      title: "RQG.Dialog.RuneMagicRoll.Title",
      resizable: false,
    },
  };

  static override PARTS = {
    header: { template: templatePaths.rollHeader },
    form: { template: templatePaths.runeMagicRollDialogV2, scrollable: [""] },
    footer: { template: templatePaths.rollFooter },
  };

  override async _prepareContext(): Promise<RuneMagicRollDialogContext> {
    const formData = ((this.element &&
      new foundry.applications.ux.FormDataExtended(this.element, {}).object) ??
      {}) as RuneMagicRollDialogFormData;

    const speaker = getSpeakerCompat({
      actor: this.casterActor,
      token: this.token,
    });

    const eligibleRunes = this.spellItem.system.getEligibleRunes(this.casterActor);

    const eligibleRuneOptions = eligibleRunes.map((rune) => ({
      value: rune.id ?? "",
      label: rune.name ?? "",
    }));
    formData.levelUsed ??= this.spellItem.system.points;
    formData.usedRuneId ??=
      this.spellItem.system.getStrongestEligibleRune(this.casterActor)?.id ?? "";
    formData.boost ??= 0;
    // Rune Magic only spends Magic Points when boosting, so the source picker only matters (and
    // is only shown) once the caster has actually entered a boost - see showMagicPointSource
    // below. "Auto" (drain stored sources first) is always the sensible default for that rare
    // case, regardless of any Magic Point Source Order preference set for regular Spirit Magic
    // Magic Point spending.
    formData.magicPointSource ??= AUTO_MAGIC_POINT_SOURCE;
    // Rune Points are always spent when casting (unlike the Magic Point boost, which is
    // optional), so - unlike magicPointSource above - this picker's default doesn't depend on
    // any other field: "self" is always the safe default, and the picker only even appears when
    // there's a shared-cult ally to draw from (see showRunePointSource below).
    formData.runePointSource ??= SELF_RUNE_POINT_SOURCE;
    formData.augmentModifier ??= 0;
    formData.meditateModifier ??= 0;
    formData.otherModifier ??= 0;
    formData.otherModifierDescription ??= localize("RQG.Dialog.Common.OtherModifier");
    formData.spellItemUuid ??= this.spellItem.uuid ?? undefined;
    formData.tokenUuid ??= this.token?.uuid ?? undefined;
    formData.casterActorUuid ??= this.casterActor.uuid ?? undefined;

    const usedRune = eligibleRunes.find((r) => r.id === formData.usedRuneId);
    const magicPointSourceOptions = getMagicPointSourceOptions(this.casterActor);
    const runePointSourceOptions = getRunePointSourceOptions(
      this.casterActor,
      this.spellItem.system.getCastingCult(this.casterActor),
    );
    // A bonded ally exists but doesn't have a Cult item matching this spell's exact cult (e.g. a
    // different subcult of the same deity) - without this, that misconfiguration is silent: the
    // picker just never appears, indistinguishable from having no bond at all.
    const alliedBondActor = getAlliedBondActor(this.casterActor);
    const showRunePointSourceMismatchWarning =
      runePointSourceOptions.length === 0 && !!alliedBondActor;

    const targetNote = buildSpellCastTargetNote(this.spellItem.system.resistedBy);

    return {
      formData: formData,

      speakerName: getSpeakerDisplayName(speaker),
      targetName: targetNote.targetName,
      targetNote: targetNote.targetNote,
      targetNoteClass: targetNote.targetNoteClass,
      disableRoll: targetNote.tooManyTargets,
      isStackable: this.spellItem.system.isStackable,
      isOneUse: this.spellItem.system.isOneUse,
      usedRune: usedRune,
      eligibleRuneOptions: eligibleRuneOptions,
      augmentOptions: RuneMagicRollDialogV2.augmentOptions,
      meditateOptions: RuneMagicRollDialogV2.meditateOptions,
      ritualOptions: RuneMagicRollDialogV2.ritualOptions,
      magicPointSourceOptions: magicPointSourceOptions,
      showMagicPointSource: magicPointSourceOptions.length > 0 && Number(formData.boost) > 0,
      runePointSourceOptions: runePointSourceOptions,
      showRunePointSource: runePointSourceOptions.length > 0,
      showRunePointSourceMismatchWarning: showRunePointSourceMismatchWarning,

      // RollHeader
      rollType: localize("TYPES.Item.runeMagic"),
      rollName: this.spellItem.name ?? "",
      spellSummary: this.spellItem.spellSummary ?? "",
      spellSummaryTooltip: this.spellItem.spellSummaryTooltip ?? "",
      baseChance: this.spellItem.system.getBaseChance(usedRune) + "%",

      // RollFooter
      totalChance: this.spellItem.system.getCastChance(usedRune, [
        { value: formData.augmentModifier },
        { value: formData.meditateModifier },
        { value: formData.otherModifier },
      ]),
      // A player's cast always posts a shared card, so only a GM picks a mode.
      rollMode: this.rollMode,
      rollModes: game.user?.isGM ? getConfiguredRollModeOptions() : [],
    };
  }

  private updateLivePreview(): void {
    const totalChanceElement = this.element.querySelector<HTMLElement>("[data-total-chance]");
    if (!totalChanceElement) {
      return;
    }

    const formData = new foundry.applications.ux.FormDataExtended(this.element, {})
      .object as RuneMagicRollDialogFormData;
    totalChanceElement.textContent = `${this.computeTotalChance(formData)}%`;
  }

  private static async onSubmit(
    event: SubmitEvent | Event,
    form: HTMLFormElement,
    formData: foundry.applications.ux.FormDataExtended,
  ): Promise<void> {
    const formDataObject = formData.object as RuneMagicRollDialogFormData;

    const rollMode =
      getSelectedRollMode(
        form?.querySelector<HTMLButtonElement>(
          'button[data-action="rollMode"][aria-pressed="true"]',
        )?.dataset["rollMode"],
      ) ?? getDefaultRollMode();

    const spellItem: RqgItem | PartialAbilityItem | undefined = (await fromUuid(
      formDataObject.spellItemUuid ?? "",
    )) as RqgItem | undefined;

    const token = formDataObject.tokenUuid
      ? ((await fromUuid(formDataObject.tokenUuid)) as TokenDocument | undefined)
      : undefined;

    if (!spellItem || !(spellItem instanceof RqgItem)) {
      ui.notifications?.error("Could not find an rune magic spellItem to roll.");
      return;
    }
    assertDocumentSubType<RuneMagicItem>(spellItem, ItemTypeEnum.RuneMagic);

    const casterActor = formDataObject.casterActorUuid
      ? ((await fromUuid(formDataObject.casterActorUuid)) as RqgActor | undefined)
      : (spellItem.actor ?? undefined);
    assertDocumentSubType<CharacterActor>(casterActor, ActorTypeEnum.Character);

    const eligibleRunes = spellItem.system.getEligibleRunes(casterActor);

    const usedRune = eligibleRunes.find((r) => r.id === formDataObject.usedRuneId);
    if (!usedRune) {
      const msg = "No rune to cast the rune magic spell";
      return logger.throw(msg, formDataObject);
    }

    if (!spellItem.system.getCastingCult(casterActor)) {
      const msg = "No cult to cast the rune magic spell";
      return logger.throw(msg, {
        actorId: casterActor.id,
        spellItemId: spellItem.id,
        cultId: spellItem.system.cultId,
      });
    }
    const options: RuneMagicRollImmediateOptions = {
      usedRuneId: usedRune.id ?? undefined,
      levelUsed: formDataObject.levelUsed,
      magicPointBoost: formDataObject.boost,
      magicPointSource: formDataObject.magicPointSource,
      runePointSource: formDataObject.runePointSource,
      modifiers: [
        {
          value: Number(formDataObject.augmentModifier),
          description: localize("RQG.Roll.Common.Augment"),
        },
        {
          value: Number(formDataObject.meditateModifier),
          description:
            Number(formDataObject.meditateModifier) >= 30
              ? localize("RQG.Roll.RuneMagicRoll.Ritual")
              : localize("RQG.Roll.Common.Meditate"),
        },
        {
          value: Number(formDataObject.otherModifier),
          description: normalizeOtherModifierDescriptionForRoll(
            formDataObject.otherModifierDescription,
          ),
        },
      ],
      rollMode: rollMode,
    };
    const validationError = spellItem.system.getCastValidationError(
      formDataObject.levelUsed,
      formDataObject.boost,
      formDataObject.magicPointSource,
      formDataObject.runePointSource,
      casterActor,
    );
    if (validationError) {
      ui.notifications?.warn(validationError);
      return;
    }

    await spellItem.runeMagicRollImmediate(options, token, casterActor);
  }
}
