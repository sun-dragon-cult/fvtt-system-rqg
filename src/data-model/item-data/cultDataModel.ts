import { RqgItemDataModel } from "./RqgItemDataModel";
import { rqidLinkSchemaField, rqidLinkArraySchemaField } from "../shared/rqidLinkField";
import { resourceSchemaField } from "../shared/resourceSchemaField";
import { CultRankEnum } from "./cultData";
import { enumChoices } from "../shared/enumChoices";

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
