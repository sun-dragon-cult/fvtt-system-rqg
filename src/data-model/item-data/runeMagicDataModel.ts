import type { RqgItem } from "@items/rqgItem.ts";
import { RqgItemDataModel } from "./RqgItemDataModel";
import { spellSchemaFields } from "../shared/spellSchemaFields";
import type { RqidLink } from "../shared/rqidLink";
import type { RqidString } from "../../system/api/rqidApi";
import { rqidLinkArraySchemaField } from "../shared/rqidLinkField";
import { RqgError, getSpeakerFromItem, localize, assertDocumentSubType } from "../../system/util";
import type { RuneMagicRollOptions } from "../../rolls/RuneMagicRoll/RuneMagicRoll.types";
import { ActorTypeEnum, type CharacterActor } from "../actor-data/rqgActorData";
import type { CultItem } from "./cultDataModel";
import {
  type SpellItem,
  SpellConcentrationEnum,
  spellItemTypes,
  SpellDurationEnum,
  SpellRangeEnum,
} from "./spell";

export type RuneMagicItem = RqgItem & { system: Item.SystemOfType<"runeMagic"> };

const { BooleanField, StringField } = foundry.data.fields;

type RuneMagicSchema = ReturnType<typeof RuneMagicDataModel.defineSchema>;

export class RuneMagicDataModel extends RqgItemDataModel<RuneMagicSchema, { chance: number }> {
  declare descriptionRqidLink: RqidLink<RqidString>;

  static override defineSchema() {
    return {
      ...spellSchemaFields(),
      cultId: new StringField({ blank: true, nullable: false, initial: "" }),
      runeRqidLinks: rqidLinkArraySchemaField(),
      isStackable: new BooleanField({ nullable: false, initial: false }),
      isOneUse: new BooleanField({ nullable: false, initial: false }),
    } as const;
  }

  /**
   * Open a dialog for a RuneMagicRoll.
   */
  async runeMagicRoll(): Promise<void> {
    // Dynamic import to avoid circular dependency through RuneMagicRollDialogV2 → rqgItem.ts
    const { RuneMagicRollDialogV2 } =
      await import("../../applications/RuneMagicRollDialog/runeMagicRollDialogV2");
    await new RuneMagicRollDialogV2(this.parent as unknown as RuneMagicItem).render(true);
  }

  /**
   * Do a runeMagicRoll and possibly draw rune and magic points afterward.
   * Also adds experience to the used rune.
   */
  async runeMagicRollImmediate(options: Partial<RuneMagicRollOptions> = {}): Promise<void> {
    const item = this.parent;
    const actor = item?.parent;
    assertDocumentSubType<CharacterActor>(actor, ActorTypeEnum.Character, "Item is not embedded");

    // Dynamic imports to avoid circular dependencies through rqgItem.ts
    const { getEligibleRunes, getStrongestRune, handleRollResult, hasEnoughToCastSpell } =
      await import("../../items/rune-magic-item/runeMagicCasting");
    const { RuneMagicRoll } = await import("../../rolls/RuneMagicRoll/RuneMagicRoll");

    const cult = actor.items.find((i) => i.id === this.cultId) as RqgItem | undefined;
    if (!cult) {
      const msg = "Rune Magic item isn't connected to a cult";
      ui.notifications?.error(msg);
      throw new RqgError(msg, item);
    }
    // Use string literal "cult" to avoid circular dep through ItemTypeEnum → itemTypes.ts → runeMagic.ts → rqgItem.ts
    assertDocumentSubType<CultItem>(cult, "cult" as Item.SubType);

    const levelUsedOrDefault = options.levelUsed ?? this.points;

    const validationError = hasEnoughToCastSpell(cult, levelUsedOrDefault, options.magicPointBoost);
    if (validationError) {
      ui.notifications?.warn(validationError);
      return;
    }

    const runeMagicItemTyped = item as unknown as RuneMagicItem;
    const usedRune = options.usedRune
      ? options.usedRune
      : getStrongestRune(getEligibleRunes(runeMagicItemTyped));
    if (!usedRune) {
      const msg = "Could not find a rune to use for rune magic";
      ui.notifications?.warn(msg);
      return;
    }

    const runeMagicRoll = await RuneMagicRoll.rollAndShow({
      usedRune: usedRune,
      runeMagicItem: runeMagicItemTyped,
      levelUsed: levelUsedOrDefault,
      magicPointBoost: options.magicPointBoost ?? 0,
      modifiers: options?.modifiers ?? [],
      speaker: getSpeakerFromItem(item),
      rollMode: options?.rollMode,
    });
    if (runeMagicRoll.successLevel == null) {
      throw new RqgError("Evaluated RuneMagicRoll didn't give successLevel");
    }
    const mpCost = options.magicPointBoost ?? 0;
    const rpCost = options.levelUsed ?? this.points;
    await handleRollResult(
      runeMagicRoll.successLevel,
      rpCost,
      mpCost,
      usedRune,
      runeMagicItemTyped,
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
