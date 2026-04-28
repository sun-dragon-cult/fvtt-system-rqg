import type { RqgItem } from "@items/rqgItem.ts";
import type { RqgActor } from "@actors/rqgActor.ts";
import { RqgItemDataModel } from "./RqgItemDataModel";
import { physicalItemSchemaFields } from "../shared/physicalItemSchemaFields";
import { getLocationRelatedUpdates } from "../../items/shared/physicalItemUtil";

export type GearItem = RqgItem & { system: Item.SystemOfType<"gear"> };

const gearSchema = {
  ...physicalItemSchemaFields(),
} as const;

type GearSchema = typeof gearSchema;

export class GearDataModel extends RqgItemDataModel<GearSchema> {
  static override defineSchema() {
    return gearSchema;
  }

  override preUpdateItem(actor: RqgActor, updates: object[]): void {
    updates.push(
      ...getLocationRelatedUpdates(actor.items.contents, this.parent as GearItem, updates),
    );
  }
}
