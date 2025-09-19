import { AbstractEmbeddedItem } from "../abstractEmbeddedItem";
import { RqgActor } from "@actors/rqgActor.ts";
import { RqgItem } from "../rqgItem";
import { ItemTypeEnum } from "@item-model/itemTypes.ts";
import { getLocationRelatedUpdates } from "../shared/physicalItemUtil";
import { isDocumentSubType } from "../../system/util.ts";
import type { ArmorItem } from "@item-model/armorData.ts";

export class Armor extends AbstractEmbeddedItem {
  static override preUpdateItem(actor: RqgActor, armor: RqgItem, updates: object[]): void {
    if (isDocumentSubType<ArmorItem>(armor, ItemTypeEnum.Armor)) {
      updates.push(...getLocationRelatedUpdates(actor.items.contents, armor, updates));
    }
  }
}
