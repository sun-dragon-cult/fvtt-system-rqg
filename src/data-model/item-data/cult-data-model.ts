import type { RqgItem } from "@items/rqg-item.ts";
import { RqgItemDataModel } from "./rqg-item-data-model";
import { rqidLinkSchemaField, rqidLinkArraySchemaField } from "../shared/rqid-link-field";
import type { RqidLink } from "../shared/rqid-link";
import type { RqidString } from "../../system/api/rqid-api";
import { resourceSchemaField } from "../shared/resource-schema-field";
import { enumChoices } from "../shared/enum-choices";

export type CultItem = RqgItem & { system: Item.SystemOfType<"cult"> };

import { CultRankEnum } from "./cult-enums";
export { CultRankEnum };

export interface JoinedCult {
  cultName: string | undefined; // For cults with subcults (like Orlanth & Yelm) others should have the Deity name
  tagline: string;
  rank: CultRankEnum; // TODO You can be a Rune Lord and Priest!
  // cultSkills: string[]; // TODO #204 +++ Link to system wide id...
  // favouredPassions: string[]; // TODO Link to system wide id...
  // cultEnchantments: string[]; // TODO Link to system wide id...
  // cultStartingSkills: cultStartingSkill[] // TODO #204 +++ list of skills with base chance mod, see occupation
  // cultSpiritMagic: string[]; // TODO Link to system wide id...
}

const { ArrayField, SchemaField, StringField } = foundry.data.fields;

function defineCultSchema() {
  return {
    deity: new StringField({ blank: true, nullable: true, initial: undefined }),
    descriptionRqidLink: rqidLinkSchemaField({ nullable: true }),
    runePoints: resourceSchemaField(),
    holyDays: new StringField({ blank: true, nullable: false, initial: "" }),
    gifts: new StringField({ blank: true, nullable: false, initial: "" }),
    geases: new StringField({ blank: true, nullable: false, initial: "" }),
    runeRqidLinks: rqidLinkArraySchemaField(),
    commonRuneMagicRqidLinks: rqidLinkArraySchemaField(),
    joinedCults: new ArrayField(
      new SchemaField({
        cultName: new StringField({ blank: true, nullable: true, initial: undefined }),
        tagline: new StringField({ blank: true, nullable: false, initial: "" }),
        rank: new StringField({
          blank: false,
          nullable: false,
          initial: CultRankEnum.LayMember,
          choices: enumChoices(CultRankEnum, "RQG.Actor.RuneMagic.CultRank."),
        }),
      }),
    ),
  } as const;
}

type CultSchema = ReturnType<typeof defineCultSchema>;

export class CultDataModel extends RqgItemDataModel<CultSchema> {
  declare runeRqidLinks: RqidLink<`i.rune.${string}`>[];
  declare commonRuneMagicRqidLinks: RqidLink<`i.rune-magic.${string}`>[];
  declare descriptionRqidLink: RqidLink<RqidString>;

  static override defineSchema() {
    return defineCultSchema();
  }
}
