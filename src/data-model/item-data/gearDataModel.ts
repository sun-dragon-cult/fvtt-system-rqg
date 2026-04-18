import { RqgItemDataModel } from "./RqgItemDataModel";
import { physicalItemSchemaFields } from "../shared/physicalItemSchemaFields";

const gearSchema = {
  ...physicalItemSchemaFields(),
} as const;

type GearSchema = typeof gearSchema;

export class GearDataModel extends RqgItemDataModel<GearSchema> {
  static override defineSchema() {
    return gearSchema;
  }
}
