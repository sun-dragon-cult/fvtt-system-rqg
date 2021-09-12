import { Ability } from "../../data-model/shared/ability";
import { RqgActorSheet } from "../rqgActorSheet";
import { RqgActor } from "../rqgActor";
import { assertItemType, getGameUser, getRequiredDomDataset, RqgError } from "../../system/util";
import { ItemCard } from "../../chat/itemCard";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";

export const passionMenuOptions = (
  actor: RqgActor,
  token: TokenDocument | null
): ContextMenu.Item[] => [
  {
    name: "Roll (click))",
    icon: '<i class="fas fa-dice-d20"></i>',
    condition: () => true,
    callback: async (el: JQuery) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      await ItemCard.show(itemId, actor, token);
    },
  },
  {
    name: "Direct Roll (dbl click)",
    icon: '<i class="fas fa-dice-d20"></i>',
    condition: () => true,
    callback: async (el: JQuery) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId);
      assertItemType(item?.data.type, ItemTypeEnum.Passion);
      if (item.data.data.chance == null) {
        const msg = `Couldn't find itemId [${itemId}] or item Chance (item.data.data.chance) on actor ${actor.name} to do a direct roll for passion item from the passion context menu.`;
        ui.notifications?.error(msg);
        throw new RqgError(msg);
      }
      const speakerName = token?.name ?? actor.data.token.name ?? "";
      await Ability.roll(item.name ?? "", item.data.data.chance, 0, speakerName);
    },
  },
  {
    name: "Toggle Experience",
    icon: '<i class="fas fa-lightbulb"></i>',
    condition: () => true,
    callback: async (el: JQuery) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId);
      if (!item || item.data.type !== ItemTypeEnum.Passion) {
        const msg = `Couldn't find itemId [${itemId}] on actor ${actor.name} to toggle experience on passion item from the passion context menu.`;
        ui.notifications?.error(msg);
        throw new RqgError(msg);
      }
      await item.update({ "data.hasExperience": !item.data.data.hasExperience }, {});
    },
  },
  {
    name: "Improve",
    icon: '<i class="fas fa-arrow-alt-circle-up"></i>',
    condition: (el: JQuery) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId);
      if (!item || item.data.type !== ItemTypeEnum.Passion) {
        const msg = `Couldn't find itemId [${itemId}] on actor ${actor.name} to improve passion item from the passion context menu.`;
        ui.notifications?.error(msg);
        throw new RqgError(msg);
      }
      return !!item.data.data.hasExperience;
    },
    callback: () => {
      ui.notifications?.info("TODO Improve");
    },
  },
  {
    name: "Edit back story",
    icon: '<i class="fas fa-book-open"></i>',
    condition: () => true,
    callback: async (el: JQuery) => {
      ui.notifications?.info("TODO Edit Description");
    },
  },
  {
    name: "Edit",
    icon: '<i class="fas fa-edit"></i>',
    condition: () => getGameUser().isGM,
    callback: (el: JQuery) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId);
      if (!item || !item.sheet) {
        const msg = `Couldn't find itemId [${itemId}] on actor ${actor.name} to edit a passion item from the passion context menu.`;
        ui.notifications?.error(msg);
        throw new RqgError(msg);
      }
      item.sheet.render(true);
    },
  },
  {
    name: "Delete",
    icon: '<i class="fas fa-trash"></i>',
    condition: () => getGameUser().isGM,
    callback: (el: JQuery) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      RqgActorSheet.confirmItemDelete(actor, itemId);
    },
  },
];
