import type { RqgItem } from "@items/rqg-item.ts";
import { RqgItemDataModel } from "./rqg-item-data-model";
import { physicalItemSchemaFields } from "../shared/physical-item-schema-fields";

export type GearItem = RqgItem & { system: Item.SystemOfType<"gear"> };

function defineGearSchema() {
  return {
    ...physicalItemSchemaFields(),
  } as const;
}

type GearSchema = ReturnType<typeof defineGearSchema>;

export class GearDataModel extends RqgItemDataModel<GearSchema> {
  static override defineSchema() {
    return defineGearSchema();
  }
}
