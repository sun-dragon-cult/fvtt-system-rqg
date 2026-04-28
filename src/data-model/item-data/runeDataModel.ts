import type { RqgItem } from "@items/rqgItem.ts";
import type { RqgActor } from "@actors/rqgActor.ts";
import { RqgItemDataModel } from "./RqgItemDataModel";
import { abilitySchemaFields } from "../shared/abilitySchemaFields";
import { rqidLinkSchemaField, rqidLinkArraySchemaField } from "../shared/rqidLinkField";
import type { RqidLink } from "../shared/rqidLink";
import type { RqidString } from "../../system/api/rqidApi";
import { enumChoices } from "../shared/enumChoices";
import { assertDocumentSubType, isDocumentSubType } from "../../system/util";
import { toRqidString } from "../../system/api/rqidValidation";
import { ItemTypeEnum } from "./itemTypes";

export type RuneItem = RqgItem & { system: Item.SystemOfType<"rune"> };

export const RuneTypeEnum = {
  Element: "element",
  Power: "power",
  Form: "form",
  Condition: "condition",
  Technique: "technique",
} as const;
export type RuneTypeEnum = (typeof RuneTypeEnum)[keyof typeof RuneTypeEnum];

export type RuneType = {
  type: RuneTypeEnum;
  /** Translated name of the runeType */
  name: string;
};

export const defaultRuneType = {
  type: RuneTypeEnum.Form,
  name: RuneTypeEnum.Form,
};

const { BooleanField, NumberField, SchemaField, StringField } = foundry.data.fields;

type RuneSchema = ReturnType<typeof RuneDataModel.defineSchema>;

const runeTypeValues = new Set<string>(Object.values(RuneTypeEnum));

export class RuneDataModel extends RqgItemDataModel<RuneSchema> {
  declare descriptionRqidLink: RqidLink<RqidString>;

  static override defineSchema() {
    return {
      ...abilitySchemaFields(),
      descriptionRqidLink: rqidLinkSchemaField({ nullable: true }),
      rune: new StringField({ blank: true, nullable: false, initial: "" }),
      runeType: new SchemaField({
        type: new StringField({
          blank: false,
          nullable: false,
          initial: defaultRuneType.type,
          choices: enumChoices(RuneTypeEnum, "RQG.Item.Rune.RuneType."),
        }),
        name: new StringField({ blank: true, nullable: false, initial: defaultRuneType.name }),
      }),
      chance: new NumberField({ integer: true, min: 0, nullable: false, initial: 0 }),
      opposingRuneRqidLink: rqidLinkSchemaField({ nullable: true }),
      minorRuneRqidLinks: rqidLinkArraySchemaField(),
      isMastered: new BooleanField({ nullable: false, initial: false }),
    } as const;
  }

  static override migrateData(source: Record<string, unknown>): Record<string, unknown> {
    // Legacy data stored runeType as a plain string (e.g. "power") instead of {type, name}
    if (typeof source["runeType"] === "string") {
      const legacy = source["runeType"].toLowerCase();
      source["runeType"] = {
        type: runeTypeValues.has(legacy) ? legacy : defaultRuneType.type,
        name: source["runeType"],
      };
    }
    return super.migrateData(source);
  }

  override preUpdateItem(actor: RqgActor, updates: any[]): void {
    const rune = this.parent as RuneItem;
    if (!isDocumentSubType<RuneItem>(rune, ItemTypeEnum.Rune)) {
      return;
    }
    const chanceResult = updates.find(
      (r) => r["system.chance"] != null || r?.system?.chance != null,
    );
    if (!chanceResult) {
      return;
    }
    if (rune.system.opposingRuneRqidLink?.rqid) {
      const opposingRune = actor.getBestEmbeddedDocumentByRqid(
        toRqidString(rune.system.opposingRuneRqidLink.rqid),
      );
      const chance = chanceResult["system.chance"] ?? chanceResult.system.chance;
      if (opposingRune && chance != null) {
        this.adjustOpposingRuneChance(opposingRune, chance, updates);
      }
    }
  }

  private adjustOpposingRuneChance(
    opposingRune: RqgItem | undefined,
    newChance: number,
    updates: object[],
  ): void {
    if (!opposingRune) {
      return;
    }
    assertDocumentSubType<RuneItem>(opposingRune, ItemTypeEnum.Rune);
    const opposingRuneChance = opposingRune.system.chance;
    if (newChance + opposingRuneChance !== 100) {
      updates.push({
        _id: opposingRune.id,
        system: { chance: 100 - newChance },
      });
    }
  }
}
