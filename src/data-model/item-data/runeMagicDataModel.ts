import type { RqgItem } from "@items/rqgItem.ts";
import { RqgItemDataModel } from "./RqgItemDataModel";
import { spellSchemaFields } from "../shared/spellSchemaFields";
import type { RqidLink } from "../shared/rqidLink";
import type { RqidString } from "../../system/api/rqidApi";

export type RuneMagicItem = RqgItem & { system: Item.SystemOfType<"runeMagic"> };
import { rqidLinkArraySchemaField } from "../shared/rqidLinkField";

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
}
