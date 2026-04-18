import type { RqgItem } from "@items/rqgItem.ts";
import { RqgItemDataModel } from "./RqgItemDataModel";
import { physicalItemSchemaFields } from "../shared/physicalItemSchemaFields";

export type GearItem = RqgItem & { system: Item.SystemOfType<"gear"> };

const gearSchema = {
  ...physicalItemSchemaFields(),
} as const;

type GearSchema = typeof gearSchema;

export class GearDataModel extends RqgItemDataModel<GearSchema> {
  static override defineSchema() {
    return gearSchema;
  }
}
