import type { RqgItem } from "@items/rqgItem.ts";
import { RqgItemDataModel } from "./RqgItemDataModel";
import { rqidLinkSchemaField, rqidLinkArraySchemaField } from "../shared/rqidLinkField";
import type { RqidLink } from "../shared/rqidLink";

export type HomelandItem = RqgItem & { system: Item.SystemOfType<"homeland"> };

const { StringField } = foundry.data.fields;

type HomelandSchema = ReturnType<typeof HomelandDataModel.defineSchema>;

export class HomelandDataModel extends RqgItemDataModel<HomelandSchema> {
  declare skillRqidLinks: RqidLink<`i.skill.${string}`>[];
  declare runeRqidLinks: RqidLink<`i.rune.${string}`>[];
  declare passionRqidLinks: RqidLink<`i.passion.${string}`>[];

  static override defineSchema() {
    return {
      homeland: new StringField({ blank: true, nullable: false, initial: "" }),
      homelandJournalRqidLink: rqidLinkSchemaField({ nullable: true }),
      region: new StringField({ blank: true, nullable: false, initial: "" }),
      regionJournalRqidLink: rqidLinkSchemaField({ nullable: true }),
      cultureJournalRqidLinks: rqidLinkArraySchemaField(),
      tribeJournalRqidLinks: rqidLinkArraySchemaField(),
      clanJournalRqidLinks: rqidLinkArraySchemaField(),
      cultRqidLinks: rqidLinkArraySchemaField(),
      skillRqidLinks: rqidLinkArraySchemaField(),
      runeRqidLinks: rqidLinkArraySchemaField(),
      passionRqidLinks: rqidLinkArraySchemaField(),
      wizardInstructions: new StringField({ blank: true, nullable: false, initial: "" }),
    } as const;
  }
}
