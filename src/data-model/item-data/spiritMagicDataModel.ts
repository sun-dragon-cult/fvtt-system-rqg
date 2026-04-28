import type { RqgItem } from "@items/rqgItem.ts";
import { RqgItemDataModel } from "./RqgItemDataModel";
import { spellSchemaFields } from "../shared/spellSchemaFields";
import type { RqidLink } from "../shared/rqidLink";
import type { RqidString } from "../../system/api/rqidApi";
import { RqgError, getSpeakerFromItem, localize, assertDocumentSubType } from "../../system/util";
import type { SpiritMagicRollOptions } from "../../rolls/SpiritMagicRoll/SpiritMagicRoll.types";
import { ActorTypeEnum, type CharacterActor } from "../actor-data/rqgActorData";
import {
  type SpellItem,
  SpellConcentrationEnum,
  spellItemTypes,
  SpellDurationEnum,
  SpellRangeEnum,
} from "./spell";

export type SpiritMagicItem = RqgItem & { system: Item.SystemOfType<"spiritMagic"> };

const { ArrayField, BooleanField, StringField } = foundry.data.fields;

type SpiritMagicSchema = ReturnType<typeof SpiritMagicDataModel.defineSchema>;

export class SpiritMagicDataModel extends RqgItemDataModel<SpiritMagicSchema> {
  declare descriptionRqidLink: RqidLink<RqidString>;

  static override defineSchema() {
    return {
      ...spellSchemaFields(),
      isVariable: new BooleanField({ nullable: false, initial: false }),
      incompatibleWith: new ArrayField(
        new StringField({ blank: true, nullable: false, initial: "" }),
      ),
      spellFocus: new StringField({ blank: true, nullable: false, initial: "" }),
      isMatrix: new BooleanField({ nullable: false, initial: false }),
    } as const;
  }

  /**
   * Open a dialog for a SpiritMagicRoll.
   */
  async spiritMagicRoll(): Promise<void> {
    // Dynamic import to avoid circular dependency through SpiritMagicRollDialogV2 → rqgItem.ts
    const { SpiritMagicRollDialogV2 } =
      await import("../../applications/SpiritMagicRollDialog/spiritMagicRollDialogV2");
    await new SpiritMagicRollDialogV2(this.parent as unknown as SpiritMagicItem).render(true);
  }

  /**
   * Do a SpiritMagicRoll and possibly draw magic points afterward.
   */
  async spiritMagicRollImmediate(
    options: Omit<SpiritMagicRollOptions, "powX5"> = { levelUsed: this.points },
  ): Promise<void> {
    const item = this.parent;
    const actor = item?.actor;
    assertDocumentSubType<CharacterActor>(actor, ActorTypeEnum.Character, "Item is not embedded");

    const powX5: number = (Number(actor.system.characteristics.power.value) || 0) * 5; // Handle NaN

    // Dynamic import to avoid circular dependency through SpiritMagicRoll → itemTypes.ts → rqgItem.ts
    const { SpiritMagicRoll } = await import("../../rolls/SpiritMagicRoll/SpiritMagicRoll");
    const spiritMagicRoll = await SpiritMagicRoll.rollAndShow({
      powX5: powX5,
      levelUsed: options.levelUsed ?? this.points,
      magicPointBoost: options.magicPointBoost ?? 0,
      modifiers: options?.modifiers,
      spellName: item?.name ?? undefined,
      spellImg: item?.img ?? undefined,
      speaker: getSpeakerFromItem(item),
      rollMode: options?.rollMode,
    });
    if (spiritMagicRoll.successLevel == null) {
      throw new RqgError("Evaluated AbilityRoll didn't give successLevel");
    }
    const mpCost = options.levelUsed + (options.magicPointBoost ?? 0);
    await actor.drawMagicPoints(mpCost, spiritMagicRoll.successLevel);
  }

  /**
   * Constructs a description close to what is used in the books.
   */
  get spellSummary(): string {
    const item = this.parent as unknown as SpellItem;
    assertDocumentSubType<SpellItem>(
      item,
      spellItemTypes,
      "Tried to get spellSummary on a non spell item: " + item?.type,
    );

    const descriptionParts = [];
    const variableSpiritMagic = this.isVariable
      ? " " + localize("RQG.Item.SpiritMagic.Variable")
      : "";
    const pointsTranslated =
      this.points === 1 ? localize("RQG.Item.Spell.Point") : localize("RQG.Item.Spell.Points");
    descriptionParts.push(`${this.points} ${pointsTranslated}${variableSpiritMagic}`);

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

    return descriptionParts.join(", ");
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
