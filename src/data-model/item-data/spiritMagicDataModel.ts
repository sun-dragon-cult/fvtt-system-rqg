import type { RqgItem } from "@items/rqgItem.ts";
import { RqgItemDataModel } from "./RqgItemDataModel";
import { spellSchemaFields } from "../shared/spellSchemaFields";
import type { RqidLink } from "../shared/rqidLink";
import type { RqidString } from "../../system/api/rqidApi";

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
}
