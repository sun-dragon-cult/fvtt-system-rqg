import type { RqgActor } from "@actors/rqg-actor.ts";
import type { RqgItem } from "@items/rqg-item.ts";
import { RqgItemDataModel } from "./rqg-item-data-model";
import { migrateSpellBooleanFields, spellSchemaFields } from "../shared/spell-schema-fields";
import { postSpellCastResult, resolveResistedSpellCastTarget } from "../shared/spell-resisted-by";
import { spellMaxTargets, tokensInSpellArea } from "../../system/spell-effects/spell-area-targets";
import type { RqidLink } from "../shared/rqid-link";
import type { RqidString } from "../../system/api/rqid-api";
import { RqgError, localize, assertDocumentSubType } from "../../system/util";
import { callRqgHook, callRqgPreHook, getSpeakerCompat } from "../../system/fvtt-type-compat";
import { isForbidden, type RollPreparation } from "../../rolls/roll-preparation";
import type { SpellCastOptions } from "../../rolls/roll-method-options";
import type { SpiritMagicRollOptions } from "../../rolls/spirit-magic-roll/spirit-magic-roll.types";
import type { SpiritMagicRoll } from "../../rolls/spirit-magic-roll/spirit-magic-roll";
import { ActorTypeEnum, type CharacterActor } from "../actor-data/rqg-actor-data";
import {
  AUTO_MAGIC_POINT_SOURCE,
  confirmBoundSpiritDrain,
  getAvailableMagicPoints,
  type MagicPointSourceSelection,
} from "../../system/magic-point-source";
import {
  type SpellItem,
  SpellConcentrationEnum,
  spellItemTypes,
  SpellDurationEnum,
  SpellRangeEnum,
} from "./spell";

export type SpiritMagicItem = RqgItem & { system: Item.SystemOfType<"spiritMagic"> };

const { BooleanField, StringField } = foundry.data.fields;

function defineSpiritMagicSchema() {
  return {
    ...spellSchemaFields(),
    isVariable: new BooleanField({ nullable: false, initial: false }),
    spellFocus: new StringField({ blank: true, nullable: false, initial: "" }),
    isMatrix: new BooleanField({ nullable: false, initial: false }),
  } as const;
}

type SpiritMagicSchema = ReturnType<typeof defineSpiritMagicSchema>;

export class SpiritMagicDataModel extends RqgItemDataModel<SpiritMagicSchema> {
  declare descriptionRqidLink: RqidLink<RqidString>;

  static override defineSchema() {
    return defineSpiritMagicSchema();
  }

  static override migrateData(source: Record<string, unknown>): Record<string, unknown> {
    migrateSpellBooleanFields(source);
    return super.migrateData(source);
  }

  getCastValidationError(
    levelUsed: number | undefined,
    boost: number = 0,
    magicPointSource?: MagicPointSourceSelection,
    casterActor: RqgActor | undefined = this.parent?.actor ?? undefined,
  ): string | undefined {
    const normalizedLevelUsed = levelUsed == null ? undefined : Number(levelUsed);
    const normalizedBoost = Number(boost) || 0;
    const availableMagicPoints = casterActor
      ? getAvailableMagicPoints(casterActor, magicPointSource)
      : 0;

    if (
      normalizedLevelUsed == null ||
      !Number.isFinite(normalizedLevelUsed) ||
      normalizedLevelUsed > this.points
    ) {
      return localize("RQG.Item.SpiritMagic.CantCastSpellAboveLearnedLevel");
    }

    if (normalizedLevelUsed + normalizedBoost > availableMagicPoints) {
      return localize("RQG.Item.SpiritMagic.NotEnoughMagicPoints");
    }

    return undefined;
  }

  /**
   * Open the cast dialog, or with `skipDialog` cast at once. `casterActor` is who casts: the
   * spell's owner, or someone casting through an external spell source (#1002).
   */
  async cast(
    casterActor: RqgActor,
    options: SpellCastOptions = {},
  ): Promise<SpiritMagicRoll | undefined> {
    if (!options.skipDialog) {
      // Dynamic import to avoid circular dependency through SpiritMagicRollDialogV2 → rqgItem.ts
      const { SpiritMagicRollDialogV2 } =
        await import("../../applications/spirit-magic-roll-dialog/spirit-magic-roll-dialog-v2");
      await new SpiritMagicRollDialogV2(
        this.parent as unknown as SpiritMagicItem,
        options.token,
        casterActor,
      ).render({ force: true });
      return undefined;
    }
    return await this.castWithoutDialog(casterActor, options);
  }

  /** The options a cast would roll with and what the `rqg.prepareSpellCast` hook made of them. */
  prepareCast(
    casterActor: RqgActor,
    options: SpellCastOptions,
  ): { options: SpiritMagicRollOptions; preparation: RollPreparation } {
    const item = this.parent as unknown as SpiritMagicItem;
    assertDocumentSubType<CharacterActor>(
      casterActor,
      ActorTypeEnum.Character,
      "Item is not embedded",
    );
    const rollOptions: SpiritMagicRollOptions = {
      powX5: (Number(casterActor.system.characteristics.power.value) || 0) * 5, // Handle NaN
      levelUsed: Number(options.levelUsed ?? this.points),
      magicPointBoost: Number(options.magicPointBoost) || 0,
      // Quick Roll (no dialog) never sets this, so fall back to Auto (drain stored sources first)
      // instead of always using the caster's own pool - matches the cast dialogs' default.
      magicPointSource: options.magicPointSource ?? AUTO_MAGIC_POINT_SOURCE,
      modifiers: [...(options.modifiers ?? [])],
      spellName: item.name ?? undefined,
      spellImg: item.img ?? undefined,
      speaker: getSpeakerCompat({ actor: casterActor, token: options.token }),
      rollMode: options.rollMode,
    };
    const preparation: RollPreparation = {};
    callRqgHook("rqg.prepareSpellCast", item, casterActor, rollOptions, preparation);
    return { options: rollOptions, preparation };
  }

  /**
   * Runs the `rqg.prepareSpellCast` and `rqg.preSpellCast` hooks, checks the cast, rolls, posts the
   * result, draws magic points and runs `rqg.spellCast`. Undefined when the cast was stopped.
   */
  private async castWithoutDialog(
    casterActor: RqgActor,
    options: SpellCastOptions,
  ): Promise<SpiritMagicRoll | undefined> {
    const item = this.parent as unknown as SpiritMagicItem;
    assertDocumentSubType<CharacterActor>(
      casterActor,
      ActorTypeEnum.Character,
      "Item is not embedded",
    );

    const { options: rollOptions, preparation } = this.prepareCast(casterActor, options);
    if (isForbidden(preparation)) {
      return undefined;
    }
    if (!callRqgPreHook("rqg.preSpellCast", item, casterActor, rollOptions)) {
      return undefined;
    }

    const boost = rollOptions.magicPointBoost ?? 0;
    const magicPointSource = rollOptions.magicPointSource ?? AUTO_MAGIC_POINT_SOURCE;
    const validationError = this.getCastValidationError(
      rollOptions.levelUsed,
      boost,
      magicPointSource,
      casterActor,
    );
    if (validationError) {
      ui.notifications?.warn(validationError);
      return;
    }

    const areaTokens = tokensInSpellArea(item, rollOptions.levelUsed, options.token, casterActor);
    const resistedSpellTarget = await resolveResistedSpellCastTarget(
      this.resistedBy,
      casterActor,
      item.name ?? undefined,
      areaTokens,
      spellMaxTargets(item, rollOptions.levelUsed),
    );
    if (!resistedSpellTarget.proceed) {
      return;
    }

    const mpCost = rollOptions.levelUsed + boost;
    const boundSpiritDrainDecision = await confirmBoundSpiritDrain(
      casterActor,
      mpCost,
      magicPointSource,
    );
    if (!boundSpiritDrainDecision.proceed) {
      return;
    }

    // Dynamic import to avoid circular dependency through SpiritMagicRoll → itemTypes.ts → rqgItem.ts
    const { SpiritMagicRoll } = await import("../../rolls/spirit-magic-roll/spirit-magic-roll");
    const spiritMagicRoll = await SpiritMagicRoll.roll(rollOptions);
    if (spiritMagicRoll.successLevel == null) {
      throw new RqgError("Evaluated AbilityRoll didn't give successLevel");
    }

    await postSpellCastResult({
      target: resistedSpellTarget,
      resistedBy: this.resistedBy,
      resistedWith: this.resistedWith,
      targetKind: this.targetKind,
      castRoll: spiritMagicRoll,
      casterActor: casterActor,
      casterToken: options.token,
      spellUuid: item.uuid ?? "",
    });

    await casterActor.drawMagicPoints(
      mpCost,
      spiritMagicRoll.successLevel,
      magicPointSource,
      boundSpiritDrainDecision.avoidRelease,
    );
    callRqgHook("rqg.spellCast", item, casterActor, spiritMagicRoll, rollOptions);
    return spiritMagicRoll;
  }

  /**
   * Constructs a description close to what is used in the books.
   */
  get spellSummary(): string {
    const pointsTranslated =
      this.points === 1 ? localize("RQG.Item.Spell.Point") : localize("RQG.Item.Spell.Points");
    const variableSpiritMagic = this.isVariable
      ? " " + localize("RQG.Item.SpiritMagic.Variable")
      : "";
    const pointsPart = `${this.points} ${pointsTranslated}${variableSpiritMagic}`;

    return [pointsPart, ...this.getSpellSummaryRestParts()].join(", ");
  }

  /**
   * Same as spellSummary but without the leading points/variable phrase, for use where the points
   * value is displayed / edited separately (e.g. an editable points input).
   */
  get spellSummaryRest(): string {
    return this.getSpellSummaryRestParts().join(", ");
  }

  private getSpellSummaryRestParts(): string[] {
    const item = this.parent as unknown as SpellItem;
    assertDocumentSubType<SpellItem>(
      item,
      spellItemTypes,
      "Tried to get spellSummary on a non spell item: " + item?.type,
    );

    const descriptionParts = [];

    if (this.isRitual) {
      descriptionParts.push(localize("RQG.Item.Spell.Ritual"));
    }

    if (this.isEnchantment) {
      descriptionParts.push(localize("RQG.Item.Spell.Enchantment"));
    }

    const isDefaultRange = this.castingRange === SpellRangeEnum.Ranged;
    if (this.castingRange && !isDefaultRange) {
      const rangeValueTranslation = localize(
        "RQG.Item.Spell.RangeEnum." + (this.castingRange || "undefined"),
      );
      const rangeTranslation = localize("RQG.Item.SpiritMagic.Range");
      const translation =
        this.castingRange === SpellRangeEnum.Special
          ? `${rangeTranslation}(${rangeValueTranslation.toLowerCase()})`
          : rangeValueTranslation;
      descriptionParts.push(translation);
    }

    const isDefaultDuration = this.duration === SpellDurationEnum.Temporal;
    if (this.duration && !isDefaultDuration) {
      const durationValueTranslation = localize("RQG.Item.Spell.DurationEnum." + this.duration);
      const durationTranslation = localize("RQG.Item.SpiritMagic.Duration");
      const translation =
        this.duration === SpellDurationEnum.Special
          ? `${durationTranslation}(${durationValueTranslation.toLowerCase()})`
          : durationValueTranslation;
      descriptionParts.push(translation);
    }

    if (this.concentration === SpellConcentrationEnum.Active) {
      descriptionParts.push(localize("RQG.Item.Spell.ConcentrationEnum." + this.concentration));
    }

    return descriptionParts;
  }

  /**
   * Compact tooltip listing all values that feed spellSummary formatting.
   */
  get spellSummaryTooltip(): string {
    const range =
      this.castingRange === SpellRangeEnum.Ranged
        ? "50m"
        : localize("RQG.Item.Spell.RangeEnum." + (this.castingRange || "undefined"));
    const duration =
      this.duration === SpellDurationEnum.Temporal
        ? "2 minutes"
        : localize("RQG.Item.Spell.DurationEnum." + (this.duration || "undefined"));
    const concentration = localize(
      "RQG.Item.Spell.ConcentrationEnum." + (this.concentration || "undefined"),
    );

    const descriptionParts = [`Range: ${range}`, `Duration: ${duration}`];

    if (this.duration !== SpellDurationEnum.Instant) {
      descriptionParts.push(concentration);
    }

    return descriptionParts.join(" | ");
  }
}
