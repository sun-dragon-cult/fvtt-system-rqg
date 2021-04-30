import { Ability } from "../../data-model/shared/ability";
import { RqgActorSheet } from "../rqgActorSheet";
import { PassionItemData } from "../../data-model/item-data/passionData";
import { RqgActor } from "../rqgActor";
import { getRequiredDomDataset, RqgError } from "../../system/util";

export const passionMenuOptions = (actor: RqgActor): ContextMenu.Item[] => [
  {
    name: "Roll (click))",
    icon: '<i class="fas fa-dice-d20"></i>',
    condition: () => true,
    callback: () => {
      ui.notifications?.info("TODO Roll with Modifier");
    },
  },
  {
    name: "Direct Roll (dbl click)",
    icon: '<i class="fas fa-dice-d20"></i>',
    condition: () => true,
    callback: async (el: JQuery) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.getOwnedItem(itemId) as Item<PassionItemData>;
      const itemChance = item?.data.data.chance;
      if (!itemChance) {
        const msg = `Couldn't find itemId [${itemId}] or item Chance (item.data.data.chance) on actor ${actor.name} to do a direct roll for passion item from the passion context menu.`;
        ui.notifications?.error(msg);
        throw new RqgError(msg);
      }
      await Ability.roll(item.name, itemChance, 0, actor);
    },
  },
  {
    name: "Toggle Experience",
    icon: '<i class="fas fa-lightbulb"></i>',
    condition: () => true,
    callback: async (el: JQuery) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.getOwnedItem(itemId) as Item<PassionItemData>;
      if (!item) {
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
      const item = actor.getOwnedItem(itemId) as Item<PassionItemData>;
      return !!item?.data.data.hasExperience;
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
    condition: () => !!game.user?.isGM,
    callback: (el: JQuery) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.getOwnedItem(itemId) as Item<PassionItemData>;
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
    condition: () => !!game.user?.isGM,
    callback: (el: JQuery) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      RqgActorSheet.confirmItemDelete(actor, itemId);
    },
  },
];
