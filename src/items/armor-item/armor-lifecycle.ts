import type { RqgActor } from "@actors/rqg-actor.ts";
import type { RqgItem } from "../rqg-item";
import { ItemTypeEnum } from "@item-model/item-types.ts";
import { getLocationRelatedUpdates } from "../shared/physical-item-util";
import { isDocumentSubType } from "../../system/util.ts";
import type { ArmorItem } from "@item-model/armor-data-model.ts";

export const armorLifecycle = {
  handleItemUpdateDocumentsPreUpdate(actor: RqgActor, armor: RqgItem, updates: object[]): void {
    if (isDocumentSubType<ArmorItem>(armor, ItemTypeEnum.Armor)) {
      updates.push(...getLocationRelatedUpdates(actor.items.contents, armor, updates));
    }
  },
};
