import { systemId } from "../../system/config";
import { templatePaths } from "../../system/load-handlebars-templates";
import type {
  SpiritMagicRollDialogContext,
  SpiritMagicRollDialogFormData,
} from "./spirit-magic-roll-dialog-data.types.ts";
import {
  assertDocumentSubType,
  getSpeakerDisplayName,
  localize,
  normalizeOtherModifierDescriptionForRoll,
} from "../../system/util";
import { getSpeakerCompat } from "../../system/fvtt-type-compat";
import type { SpiritMagicRollOptions } from "../../rolls/spirit-magic-roll/spirit-magic-roll.types";
import type { RqgActor } from "@actors/rqg-actor.ts";
import { RqgItem } from "@items/rqg-item.ts";
import type { PartialAbilityItem } from "../ability-roll-dialog/ability-roll-dialog-data.types.ts";
import { ItemTypeEnum } from "@item-model/item-types.ts";
import type { SpiritMagicItem } from "@item-model/spirit-magic-data-model.ts";
import { ActorTypeEnum, type CharacterActor } from "../../data-model/actor-data/rqg-actor-data.ts";
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
  getMagicPointSourceOptions,
} from "../../system/magic-point-source";

export class SpiritMagicRollDialogV2 extends RqgInteractiveRollApplicationBase {
  private computeTotalChance(formData: SpiritMagicRollDialogFormData): number {
    return (
      Number(this.powX5) +
      Number(formData.augmentModifier ?? 0) +
      Number(formData.meditateModifier ?? 0) +
      Number(formData.otherModifier ?? 0)
    );
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

  private spellItem: SpiritMagicItem;
  private casterActor: CharacterActor;
  private powX5: number;
  private token: TokenDocument | null | undefined;

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

  /**
   * `casterActor` defaults to the spell's own owner - pass it explicitly when the spell is being
   * cast via an external spell source (#1002, e.g. an Allied Spirit bond partner's known spells)
   * so POWx5% and the Magic Point source options both reflect the actual caster.
   */
  constructor(
    spellItem: SpiritMagicItem,
    token?: TokenDocument | null,
    casterActor?: RqgActor,
    options?: Partial<foundry.applications.types.ApplicationConfiguration>,
  ) {
    super(options);

    const caster = casterActor ?? spellItem.parent;
    assertDocumentSubType<CharacterActor>(caster, ActorTypeEnum.Character);

    this.spellItem = spellItem;
    this.casterActor = caster;
    this.powX5 = (caster.system?.characteristics?.power?.value ?? 0) * 5;
    this.token = token;
  }

  static override DEFAULT_OPTIONS = {
    id: "spirit-magic-{id}",
    tag: "form",
    classes: [systemId, "form", "roll-dialog", "spirit-magic-roll-dialog"],
    form: {
      handler: SpiritMagicRollDialogV2.onSubmit,
      submitOnChange: false,
      closeOnSubmit: true,
    },
    position: {
      width: "auto" as const,
      left: 35,
      top: 15,
    },
    window: {
      contentClasses: ["standard-form"],
      icon: "fa-solid fa-dice",
      title: "RQG.Dialog.SpiritMagicRoll.Title",
      resizable: false,
    },
  };

  static override PARTS = {
    header: { template: templatePaths.rollHeader },
    form: { template: templatePaths.spiritMagicRollDialogV2, scrollable: [""] },
    footer: { template: templatePaths.rollFooter },
  };

  override async _prepareContext(): Promise<SpiritMagicRollDialogContext> {
    const formData = ((this.element &&
      new foundry.applications.ux.FormDataExtended(this.element, {}).object) ??
      {}) as SpiritMagicRollDialogFormData;

    const speaker = getSpeakerCompat({
      actor: this.spellItem.actor ?? undefined,
      token: this.token,
    });

    formData.levelUsed ??= this.spellItem.system.points;
    formData.boost ??= 0;
    formData.magicPointSource ??= AUTO_MAGIC_POINT_SOURCE;
    formData.augmentModifier ??= 0;
    formData.meditateModifier ??= 0;
    formData.otherModifier ??= 0;
    formData.otherModifierDescription ??= localize("RQG.Dialog.Common.OtherModifier");
    formData.powX5 ??= this.powX5;
    formData.spellItemUuid ??= this.spellItem.uuid ?? undefined;
    formData.spellItemJson ??= this.spellItem.isEmbedded
      ? undefined
      : JSON.stringify(this.spellItem.toObject());
    formData.tokenUuid ??= this.token?.uuid ?? undefined;
    formData.casterActorUuid ??= this.casterActor.uuid ?? undefined;

    const targetNote = buildSpellCastTargetNote(this.spellItem.system.resistedBy);

    return {
      formData: formData,

      speakerName: getSpeakerDisplayName(speaker),
      targetName: targetNote.targetName,
      targetNote: targetNote.targetNote,
      targetNoteClass: targetNote.targetNoteClass,
      disableRoll: targetNote.tooManyTargets,
      isVariable: this.spellItem.system.isVariable && this.spellItem.system.points > 1,
      augmentOptions: SpiritMagicRollDialogV2.augmentOptions,
      meditateOptions: SpiritMagicRollDialogV2.meditateOptions,
      magicPointSourceOptions: getMagicPointSourceOptions(this.casterActor),

      // RollHeader
      rollType: localize("TYPES.Item.spiritMagic"),
      rollName: this.spellItem.name ?? "",
      spellSummary: this.spellItem.spellSummary ?? "",
      spellSummaryTooltip: this.spellItem.spellSummaryTooltip ?? "",
      baseChance: (this.powX5 ?? 0) + "%",

      // RollFooter - a player's cast always posts a shared card, so only a GM picks a mode.
      totalChance: this.computeTotalChance(formData),
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
      .object as SpiritMagicRollDialogFormData;
    totalChanceElement.textContent = `${this.computeTotalChance(formData)}%`;
  }

  private static async onSubmit(
    _event: SubmitEvent | Event,
    form: HTMLFormElement,
    formData: foundry.applications.ux.FormDataExtended,
  ): Promise<void> {
    const formDataObject = formData.object as SpiritMagicRollDialogFormData;

    const rollMode =
      getSelectedRollMode(
        form?.querySelector<HTMLButtonElement>(
          'button[data-action="rollMode"][aria-pressed="true"]',
        )?.dataset["rollMode"],
      ) ?? getDefaultRollMode();

    let spellItem: RqgItem | PartialAbilityItem | undefined = (await fromUuid(
      formDataObject.spellItemUuid ?? "",
    )) as RqgItem | undefined;

    // spellItemUuid doesn't round-trip for an unembedded/transient spell (e.g. a Matrix Spell
    // resolution, #959, see resolveMatrixSpellItem) - fall back to the JSON snapshot taken at
    // dialog-open time, same "unpersisted item survives as JSON" idiom as reputationItemJson in
    // ability-roll-dialog-v2.ts.
    if (!spellItem && formDataObject.spellItemJson) {
      spellItem = new CONFIG.Item.documentClass(
        JSON.parse(formDataObject.spellItemJson),
      ) as unknown as RqgItem;
    }

    const token = formDataObject.tokenUuid
      ? ((await fromUuid(formDataObject.tokenUuid)) as TokenDocument | undefined)
      : undefined;

    if (!spellItem || !(spellItem instanceof RqgItem)) {
      ui.notifications?.error("Could not find an spirit magic spellItem to roll.");
      return;
    }
    assertDocumentSubType<SpiritMagicItem>(spellItem, ItemTypeEnum.SpiritMagic);

    const casterActor = formDataObject.casterActorUuid
      ? ((await fromUuid(formDataObject.casterActorUuid)) as RqgActor | undefined)
      : (spellItem.actor ?? undefined);
    assertDocumentSubType<CharacterActor>(casterActor, ActorTypeEnum.Character);

    const options: SpiritMagicRollOptions = {
      powX5: formDataObject.powX5,
      levelUsed: formDataObject.levelUsed,
      magicPointBoost: formDataObject.boost,
      magicPointSource: formDataObject.magicPointSource,
      modifiers: [
        {
          value: Number(formDataObject.augmentModifier),
          description: localize("RQG.Roll.Common.Augment"),
        },
        {
          value: Number(formDataObject.meditateModifier),
          description: localize("RQG.Roll.Common.Meditate"),
        },
        {
          value: Number(formDataObject.otherModifier),
          description: normalizeOtherModifierDescriptionForRoll(
            formDataObject.otherModifierDescription,
          ),
        },
      ],
      spellName: spellItem?.name ?? undefined,
      spellImg: spellItem?.img ?? undefined,
      rollMode: rollMode,
      speaker: getSpeakerCompat({ actor: casterActor, token }),
    };
    const validationError = spellItem.system.getCastValidationError(
      formDataObject.levelUsed,
      Number(formDataObject.boost ?? 0),
      formDataObject.magicPointSource,
      casterActor,
    );
    if (validationError) {
      ui.notifications?.warn(validationError);
      return;
    }

    await spellItem.spiritMagicRollImmediate(options, token, casterActor);
  }
}
