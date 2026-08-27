import type { RqgActor } from "@actors/rqg-actor.ts";
import type { RqgItem } from "@items/rqg-item.ts";
import { RqgItemDataModel } from "./rqg-item-data-model";
import { migrateSpellBooleanFields, spellSchemaFields } from "../shared/spell-schema-fields";
import { maybePromptResistanceRollForCast } from "../shared/spell-resistance-check";
import type { RqidLink } from "../shared/rqid-link";
import type { RqidString } from "../../system/api/rqid-api";
import { rqidLinkArraySchemaField } from "../shared/rqid-link-field";
import { localize, assertDocumentSubType, isDocumentSubType, isTruthy } from "../../system/util";
import { RqgLogger } from "../../system/logging/rqg-logger";
import { getSpeakerCompat } from "../../system/fvtt-type-compat";
import type { RuneMagicRollImmediateOptions } from "../../rolls/rune-magic-roll/rune-magic-roll.types";
import { AbilitySuccessLevelEnum } from "../../rolls/ability-roll/ability-roll.defs";
import { ActorTypeEnum, type CharacterActor } from "../actor-data/rqg-actor-data";
import {
  AUTO_MAGIC_POINT_SOURCE,
  confirmBoundSpiritDrain,
  getAvailableMagicPoints,
  type MagicPointSourceSelection,
} from "../../system/magic-point-source";
import {
  findMatchingCultByRqid,
  getAvailableRunePoints,
  type RunePointSourceSelection,
  SELF_RUNE_POINT_SOURCE,
} from "../../system/rune-point-source";
import type { CultItem } from "./cult-data-model";
import type { RuneItem } from "./rune-data-model";
import { toRqidString } from "../../system/api/rqid-validation";
import {
  type SpellItem,
  SpellConcentrationEnum,
  spellItemTypes,
  SpellDurationEnum,
  SpellRangeEnum,
} from "./spell";

export type RuneMagicItem = RqgItem & { system: Item.SystemOfType<"runeMagic"> };

type ChanceModifier = { value?: number | string | null | undefined };
type RpAndMpCost = { mp: number; rp: number; exp: boolean };

const { BooleanField, StringField } = foundry.data.fields;
const logger = new RqgLogger("RuneMagicDataModel");

function defineRuneMagicSchema() {
  return {
    ...spellSchemaFields(),
    cultId: new StringField({ blank: true, nullable: false, initial: "" }),
    runeRqidLinks: rqidLinkArraySchemaField(),
    isStackable: new BooleanField({ nullable: false, initial: false }),
    isOneUse: new BooleanField({ nullable: false, initial: false }),
  } as const;
}

type RuneMagicSchema = ReturnType<typeof defineRuneMagicSchema>;

export class RuneMagicDataModel extends RqgItemDataModel<RuneMagicSchema, { chance: number }> {
  declare descriptionRqidLink: RqidLink<RqidString>;

  static override defineSchema() {
    return defineRuneMagicSchema();
  }

  static override migrateData(source: Record<string, unknown>): Record<string, unknown> {
    migrateSpellBooleanFields(source);
    return super.migrateData(source);
  }

  getCult(): CultItem | undefined {
    const cult = this.parent?.actor?.items.get(this.cultId) as RqgItem | undefined;
    return isDocumentSubType<CultItem>(cult, "cult" as Item.SubType) ? cult : undefined;
  }

  /**
   * The cult this spell is cast under, from `casterActor`'s point of view - the spell's own cult
   * (`getCult()`, a local-id lookup) when `casterActor` is this Item's own owner, or that same
   * cult matched by rqid onto `casterActor`'s own Cult items when the spell is being cast via an
   * external spell source (#1002, e.g. an Allied Spirit bond partner's known spells). `cultId` is a
   * local Foundry document id, only meaningful on the actor the spell Item actually lives on - it
   * can't be resolved directly against a different actor, hence the rqid fallback via
   * findMatchingCultByRqid (rune-point-source.ts, shared with getAlliedCultItem's reverse
   * direction of this same match).
   */
  getCastingCult(casterActor: RqgActor): CultItem | undefined {
    const ownCult = this.getCult();
    if (!ownCult) {
      return undefined;
    }
    // Compare by uuid, not object identity - casterActor may have round-tripped through
    // fromUuid/fromUuidSync (e.g. resolved from a roll dialog's hidden form field) rather than
    // being the exact same in-memory reference as this.parent?.actor.
    if (casterActor.uuid === this.parent?.actor?.uuid) {
      return ownCult;
    }
    return findMatchingCultByRqid(casterActor, ownCult);
  }

  /**
   * `casterActor` defaults to this Item's own owner (unchanged pre-#1002 behavior) - pass it
   * explicitly to find the Runes the actual caster would roll against when casting via an external
   * spell source, so the caster's own Rune chance is used, never the spell owner's.
   */
  getEligibleRunes(
    casterActor: RqgActor | undefined = this.parent?.actor ?? undefined,
  ): RuneItem[] {
    const cult = casterActor ? this.getCastingCult(casterActor) : undefined;
    if (!casterActor || !cult) {
      return [];
    }

    const runeMagicRuneRqids = [
      ...new Set(this.runeRqidLinks.map((r) => r.rqid).filter(isTruthy)),
    ] as string[];

    const usableRuneRqids = runeMagicRuneRqids.includes(CONFIG.RQG.runeRqid.magic)
      ? [...new Set(cult.system.runeRqidLinks.map((r) => r.rqid))].filter(isTruthy)
      : runeMagicRuneRqids;

    return usableRuneRqids
      .map(
        (runeRqid) => casterActor.getBestEmbeddedDocumentByRqid(toRqidString(runeRqid)) as RuneItem,
      )
      .filter(isTruthy);
  }

  static getStrongestRune(runeItems: RuneItem[]): RuneItem | undefined {
    if (runeItems.length === 0) {
      return undefined;
    }
    return runeItems.reduce((strongest, current) => {
      const strongestRuneChance = strongest.system.chance ?? 0;
      const currentRuneChance = current.system.chance ?? 0;
      return strongestRuneChance > currentRuneChance ? strongest : current;
    });
  }

  getStrongestEligibleRune(casterActor?: RqgActor): RuneItem | undefined {
    return RuneMagicDataModel.getStrongestRune(this.getEligibleRunes(casterActor));
  }

  getBaseChance(usedRune: RuneItem | null | undefined): number {
    return Number(usedRune?.system.chance ?? 0);
  }

  getDefaultChance(casterActor?: RqgActor): number {
    return this.getBaseChance(this.getStrongestEligibleRune(casterActor));
  }

  static calculateCastChanceFromBaseChance(
    baseChance: number,
    modifiers: ChanceModifier[] = [],
  ): number {
    const normalizedBaseChance = Number(baseChance);
    const modificationsSum = modifiers.reduce((acc, mod) => acc + (Number(mod?.value) || 0), 0);
    return Math.max(
      0,
      (Number.isFinite(normalizedBaseChance) ? normalizedBaseChance : 0) + modificationsSum,
    );
  }

  static calculateCastChance(
    usedRune: RuneItem | null | undefined,
    modifiers: ChanceModifier[] = [],
  ): number {
    return RuneMagicDataModel.calculateCastChanceFromBaseChance(
      Number(usedRune?.system.chance ?? 0),
      modifiers,
    );
  }

  getCastChance(usedRune: RuneItem | null | undefined, modifiers: ChanceModifier[] = []): number {
    return RuneMagicDataModel.calculateCastChance(usedRune, modifiers);
  }

  getCastValidationError(
    runePointCost: number | undefined,
    magicPointsBoost: number = 0,
    magicPointSource?: MagicPointSourceSelection,
    runePointSource: RunePointSourceSelection = SELF_RUNE_POINT_SOURCE,
    casterActor: RqgActor | undefined = this.parent?.actor ?? undefined,
  ): string | undefined {
    const cult = casterActor ? this.getCastingCult(casterActor) : undefined;
    const availableRunePoints = getAvailableRunePoints(casterActor, cult, runePointSource);
    const availableMagicPoints = casterActor
      ? getAvailableMagicPoints(casterActor, magicPointSource)
      : 0;
    if (runePointCost == null || runePointCost > availableRunePoints) {
      return game.i18n?.format("RQG.Item.RuneMagic.validationNotEnoughRunePoints");
    }
    if (magicPointsBoost > availableMagicPoints) {
      return localize("RQG.Item.RuneMagic.validationNotEnoughMagicPoints");
    }
    return undefined;
  }

  static calculatePointCosts(
    result: AbilitySuccessLevelEnum,
    runePointCost: number,
    magicPointsUsed: number,
  ): RpAndMpCost {
    switch (result) {
      case AbilitySuccessLevelEnum.Critical:
        return {
          mp: magicPointsUsed,
          rp: 0,
          exp: true,
        };

      case AbilitySuccessLevelEnum.Success:
      case AbilitySuccessLevelEnum.Special:
        return {
          mp: magicPointsUsed,
          rp: runePointCost,
          exp: true,
        };

      case AbilitySuccessLevelEnum.Failure: {
        const boosted = magicPointsUsed >= 1 ? 1 : 0;
        return {
          mp: boosted,
          rp: 0,
          exp: false,
        };
      }

      case AbilitySuccessLevelEnum.Fumble: {
        const boosted = magicPointsUsed >= 1 ? 1 : 0;
        return {
          mp: boosted,
          rp: runePointCost,
          exp: false,
        };
      }

      default:
        return logger.throw("Got unexpected result from roll in runeMagicChat");
    }
  }

  /**
   * Open a dialog for a RuneMagicRoll. `casterActor` defaults to the spell's own owner - pass it
   * explicitly when the spell is being cast via an external spell source (#1002, e.g. an Allied
   * Spirit bond partner's known spells) so the roll uses the caster's own Rune chance, not the
   * spell owner's.
   */
  async runeMagicRoll(token?: TokenDocument | null, casterActor?: RqgActor): Promise<void> {
    // Dynamic import to avoid circular dependency through RuneMagicRollDialogV2 → rqgItem.ts
    const { RuneMagicRollDialogV2 } =
      await import("../../applications/rune-magic-roll-dialog/rune-magic-roll-dialog-v2");
    await new RuneMagicRollDialogV2(
      this.parent as unknown as RuneMagicItem,
      token,
      casterActor,
    ).render({
      force: true,
    });
  }

  /**
   * Do a runeMagicRoll and possibly draw rune and magic points afterward.
   * Also adds experience to the used rune. `casterActor` defaults to this Item's own owner (same
   * as before #1002); pass it explicitly to roll and pay for the cast as the actual caster, when
   * casting a spell known via an external spell source rather than the actor that owns this Item.
   */
  async runeMagicRollImmediate(
    options: RuneMagicRollImmediateOptions = {},
    token?: TokenDocument | null,
    casterActor: RqgActor = this.parent?.actor as RqgActor,
  ): Promise<void> {
    const item = this.parent;
    assertDocumentSubType<CharacterActor>(
      casterActor,
      ActorTypeEnum.Character,
      "Item is not embedded",
    );

    // Dynamic imports to avoid circular dependencies through rqgItem.ts
    const { handleRollResult } = await import("../../items/rune-magic-item/rune-magic-casting");
    const { RuneMagicRoll } = await import("../../rolls/rune-magic-roll/rune-magic-roll");

    const cult = this.getCastingCult(casterActor);
    if (!cult) {
      return logger.throw("Rune Magic item isn't connected to a cult", item);
    }

    const levelUsedOrDefault = options.levelUsed ?? this.points;
    // Quick Roll (no dialog) never sets this, so fall back to Auto (drain stored sources first)
    // instead of always using the caster's own pool - matches the cast dialogs' default.
    const magicPointSource = options.magicPointSource ?? AUTO_MAGIC_POINT_SOURCE;
    const runePointSource = options.runePointSource ?? SELF_RUNE_POINT_SOURCE;

    const validationError = this.getCastValidationError(
      levelUsedOrDefault,
      options.magicPointBoost,
      magicPointSource,
      runePointSource,
      casterActor,
    );
    if (validationError) {
      ui.notifications?.warn(validationError);
      return;
    }

    const boundSpiritDrainDecision = await confirmBoundSpiritDrain(
      casterActor,
      options.magicPointBoost ?? 0,
      magicPointSource,
    );
    if (!boundSpiritDrainDecision.proceed) {
      return;
    }

    const runeMagicItemTyped = item as unknown as RuneMagicItem;
    const usedRune = options.usedRuneId
      ? this.getEligibleRunes(casterActor).find((r) => r.id === options.usedRuneId)
      : this.getStrongestEligibleRune(casterActor);
    if (!usedRune) {
      const msg = "Could not find a rune to use for rune magic";
      ui.notifications?.warn(msg);
      return;
    }

    const speaker = getSpeakerCompat({ actor: casterActor, token });

    const runeMagicRoll = await RuneMagicRoll.rollAndShow({
      usedRuneName: usedRune.name ?? "",
      usedRuneChance: Number(usedRune.system.chance ?? 0),
      spellName: runeMagicItemTyped.name ?? "",
      spellImg: runeMagicItemTyped.img ?? undefined,
      isOneUse: this.isOneUse,
      levelUsed: levelUsedOrDefault,
      magicPointBoost: options.magicPointBoost ?? 0,
      modifiers: options?.modifiers ?? [],
      speaker: speaker,
      rollMode: options?.rollMode,
    });
    if (runeMagicRoll.successLevel == null) {
      return logger.throw("Evaluated RuneMagicRoll didn't give successLevel");
    }
    const mpCost = options.magicPointBoost ?? 0;
    const rpCost = options.levelUsed ?? this.points;
    await handleRollResult(
      runeMagicRoll.successLevel,
      rpCost,
      mpCost,
      usedRune,
      runeMagicItemTyped,
      magicPointSource,
      runePointSource,
      casterActor,
      boundSpiritDrainDecision.avoidRelease,
    );

    await maybePromptResistanceRollForCast(
      this.resistanceCheck,
      runeMagicRoll.successLevel,
      casterActor,
      token,
      runeMagicItemTyped.name ?? undefined,
    );
  }

  /**
   * Constructs a description close to what is used in the books.
   * The "1+" syntax is used for stackable rune magic.
   */
  get spellSummary(): string {
    const item = this.parent as unknown as SpellItem;
    assertDocumentSubType<SpellItem>(
      item,
      spellItemTypes,
      "Tried to get spellSummary on a non spell item: " + item?.type,
    );

    const descriptionParts = [];
    const stackableRuneMagic = this.isStackable ? "+" : "";
    const pointsTranslated =
      this.points === 1 ? localize("RQG.Item.Spell.Point") : localize("RQG.Item.Spell.Points");
    descriptionParts.push(`${this.points}${stackableRuneMagic} ${pointsTranslated}`);

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

    if (this.isOneUse) {
      descriptionParts.push(localize("RQG.Item.RuneMagic.OneUse"));
    }

    return descriptionParts.join(", ");
  }

  /**
   * Compact tooltip listing all values that feed spellSummary formatting.
   */
  get spellSummaryTooltip(): string {
    const yes = localize("RQG.Dialog.Common.yes");

    const range =
      this.castingRange === SpellRangeEnum.Ranged
        ? "160m"
        : localize("RQG.Item.Spell.RangeEnum." + (this.castingRange || "undefined"));
    const duration =
      this.duration === SpellDurationEnum.Temporal
        ? "15 minutes"
        : localize("RQG.Item.Spell.DurationEnum." + (this.duration || "undefined"));
    const concentration = localize(
      "RQG.Item.Spell.ConcentrationEnum." + (this.concentration || "undefined"),
    );

    const descriptionParts = [`Range: ${range}`, `Duration: ${duration}`];

    if (this.duration !== SpellDurationEnum.Instant) {
      descriptionParts.push(concentration);
    }

    if (this.isStackable) {
      descriptionParts.push(localize("RQG.Item.RuneMagic.Stackable"));
    }
    if (this.isEnchantment) {
      descriptionParts.push(`Enchantment: ${yes}`);
    }

    return descriptionParts.join(" | ");
  }
}
