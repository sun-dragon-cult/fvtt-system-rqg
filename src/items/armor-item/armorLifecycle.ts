import type { RqgActor } from "@actors/rqgActor.ts";
import type { RqgItem } from "../rqgItem";
import { ItemTypeEnum } from "@item-model/itemTypes.ts";
import { getLocationRelatedUpdates } from "../shared/physicalItemUtil";
import { isDocumentSubType } from "../../system/util.ts";
import type { ArmorItem } from "@item-model/armorDataModel.ts";

export const armorLifecycle = {
  preUpdateItem(actor: RqgActor, armor: RqgItem, updates: object[]): void {
    if (isDocumentSubType<ArmorItem>(armor, ItemTypeEnum.Armor)) {
      updates.push(...getLocationRelatedUpdates(actor.items.contents, armor, updates));
    }
  },
};
