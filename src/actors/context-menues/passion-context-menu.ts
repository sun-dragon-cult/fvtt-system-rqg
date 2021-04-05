import { Ability } from "../../data-model/shared/ability";
import { RqgActorSheet } from "../rqgActorSheet";
import { PassionItemData } from "../../data-model/item-data/passionData";
import { RqgActor } from "../rqgActor";
import { getDomDataset, logBug } from "../../system/util";

export const passionMenuOptions = (actor: RqgActor) => [
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
    callback: (el: JQuery) => {
      const itemId = getDomDataset(el, "item-id");
      const item = (itemId && actor.getOwnedItem(itemId)) as Item<PassionItemData>;
      const itemChance = item && item.data.data.chance;
      if (itemChance) {
        const result = Ability.roll(actor, itemChance, 0, item.name);
      } else {
        logBug(
          `Couldn't find itemId [${itemId}] or item Chance (item.data.data.chance) on actor ${actor.name} to do a direct roll for passion item from the passion context menu.`
        );
      }
    },
  },
  {
    name: "Toggle Experience",
    icon: '<i class="fas fa-lightbulb"></i>',
    condition: () => true,
    callback: async (el: JQuery) => {
      const itemId = getDomDataset(el, "item-id");
      const item = (itemId && actor.getOwnedItem(itemId)) as Item<PassionItemData>;
      if (item) {
        await item.update({ "data.hasExperience": !item.data.data.hasExperience }, {});
      } else {
        logBug(
          `Couldn't find itemId [${itemId}] on actor ${actor.name} to toggle experience on passion item from the passion context menu.`
        );
      }
    },
  },
  {
    name: "Improve",
    icon: '<i class="fas fa-arrow-alt-circle-up"></i>',
    condition: (el: JQuery) => {
      const itemId = getDomDataset(el, "item-id");
      const item = (itemId && actor.getOwnedItem(itemId)) as Item<PassionItemData>;
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
      const itemId = getDomDataset(el, "item-id");
      const item = (itemId && actor.getOwnedItem(itemId)) as Item<PassionItemData>;
      if (item && item.sheet) {
        item.sheet.render(true);
      } else {
        logBug(
          `Couldn't find itemId [${itemId}] on actor ${actor.name} to edit a passion item from the passion context menu.`
        );
      }
    },
  },
  {
    name: "Delete",
    icon: '<i class="fas fa-trash"></i>',
    condition: () => !!game.user?.isGM,
    callback: (el: JQuery) => {
      const itemId = getDomDataset(el, "item-id");
      if (itemId) {
        RqgActorSheet.confirmItemDelete(actor, itemId);
      } else {
        logBug(
          `Couldn't find itemId [${itemId}] on actor ${actor.name} to delete a passion item from the passion context menu.`
        );
      }
    },
  },
];
