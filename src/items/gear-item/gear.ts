import { AbstractEmbeddedItem } from "../abstractEmbeddedItem";
import { RqgActor } from "@actors/rqgActor.ts";
import { RqgItem } from "../rqgItem";
import { ItemTypeEnum } from "@item-model/itemTypes.ts";
import { getLocationRelatedUpdates } from "../shared/physicalItemUtil";
import { isDocumentSubType } from "../../system/util.ts";
import type { GearItem } from "@item-model/gearData.ts";

export class Gear extends AbstractEmbeddedItem {
  static override preUpdateItem(
    actor: RqgActor,
    gear: RqgItem,
    updates: object[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    options: any,
  ): void {
    if (isDocumentSubType<GearItem>(gear, ItemTypeEnum.Gear)) {
      const currentUpdate = updates.find((u: any) => u._id === gear.id) as
        | Record<string, unknown>
        | undefined;
      if (currentUpdate) {
        if ("system.isContainer" in currentUpdate) {
          const raw = currentUpdate["system.isContainer"];
          currentUpdate["system.isContainer"] = raw === true || raw === "true";
        }

        const systemData = currentUpdate.system as Record<string, unknown> | undefined;
        if (systemData && "isContainer" in systemData) {
          const raw = systemData.isContainer;
          systemData.isContainer = raw === true || raw === "true";
        }
      }

      updates.push(...getLocationRelatedUpdates(actor.items.contents, gear, updates));
    }
  }
}
