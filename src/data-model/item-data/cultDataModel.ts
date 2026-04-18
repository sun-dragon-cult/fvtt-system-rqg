import type { RqgItem } from "@items/rqgItem.ts";
import { RqgItemDataModel } from "./RqgItemDataModel";
import { rqidLinkSchemaField, rqidLinkArraySchemaField } from "../shared/rqidLinkField";
import { resourceSchemaField } from "../shared/resourceSchemaField";
import { enumChoices } from "../shared/enumChoices";

export type CultItem = RqgItem & { system: Item.SystemOfType<"cult"> };

export const CultRankEnum = {
  LayMember: "layMember",
  Initiate: "initiate",
  GodTalker: "godTalker",
  RunePriest: "runePriest",
  RuneLord: "runeLord",
  ChiefPriest: "chiefPriest",
  HighPriest: "highPriest",
} as const;
export type CultRankEnum = (typeof CultRankEnum)[keyof typeof CultRankEnum];

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

type CultSchema = ReturnType<typeof CultDataModel.defineSchema>;

export class CultDataModel extends RqgItemDataModel<CultSchema> {
  static override defineSchema() {
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
}
