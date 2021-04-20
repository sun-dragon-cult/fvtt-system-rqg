import { Ability } from "../../data-model/shared/ability";
import { RqgActorSheet } from "../rqgActorSheet";
import { RuneItemData } from "../../data-model/item-data/runeData";
import { RqgActor } from "../rqgActor";
import { getDomDataset, logBug } from "../../system/util";

export const runeMenuOptions = (actor: RqgActor): ContextMenu.Item[] => [
  {
    name: "Roll (click)",
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
      const itemId = getDomDataset(el, "item-id");
      const item = (itemId && actor.getOwnedItem(itemId)) as Item<RuneItemData>;
      const itemChance = item && item.data.data.chance;
      if (itemChance != null) {
        await Ability.roll(actor, itemChance, 0, item.name);
      } else {
        logBug(
          `Couldn't find itemId [${itemId}] or item chance on actor ${actor.name} to do a direct roll on the rune item from the rune context menu.`,
          true
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
      const item = (itemId && actor.getOwnedItem(itemId)) as Item<RuneItemData>;
      if (item) {
        await item.update({ "data.hasExperience": !item.data.data.hasExperience }, {});
      } else {
        logBug(
          `Couldn't find itemId [${itemId}] on actor ${actor.name} to toggle experience on a passion item from the passion context menu.`,
          true
        );
      }
    },
  },
  {
    name: "Improve",
    icon: '<i class="fas fa-arrow-alt-circle-up"></i>',
    condition: (el: JQuery) => {
      const itemId = getDomDataset(el, "item-id");
      const item = (itemId && actor.getOwnedItem(itemId)) as Item<RuneItemData>;
      return !!item?.data.data.hasExperience;
    },
    callback: () => {
      ui.notifications?.info("TODO Improve");
    },
  },
  {
    name: "View Description",
    icon: '<i class="fas fa-book-open"></i>',
    condition: (el: JQuery) => {
      const itemId = (el[0].closest("[data-item-id]") as HTMLElement).dataset.itemId;
      let firstItemEl = el[0];
      while ((firstItemEl?.previousElementSibling as HTMLElement)?.dataset?.itemId === itemId) {
        firstItemEl = firstItemEl.previousElementSibling as HTMLElement;
      }
      return !!firstItemEl.dataset.journalId;
    },
    callback: async (el: JQuery) => {
      const itemId = getDomDataset(el, "item-id");
      let firstItemEl = el[0];
      while ((firstItemEl?.previousElementSibling as HTMLElement)?.dataset?.itemId === itemId) {
        firstItemEl = firstItemEl?.previousElementSibling as HTMLElement;
      }

      const journalId = firstItemEl.dataset.journalId;
      const journalPack = firstItemEl.dataset.journalPack;
      if (journalId) {
        await RqgActorSheet.showJournalEntry(journalId, journalPack);
      } else {
        logBug(
          `Couldn't find itemId [${itemId}] or the journalId [${journalId}] on actor ${actor.name} to
          view the rune item description from the rune context menu.`,
          true,
          el,
          firstItemEl
        );
      }
    },
  },
  {
    name: "Edit",
    icon: '<i class="fas fa-edit"></i>',
    condition: () => !!game.user?.isGM,
    callback: (el: JQuery) => {
      const itemId = getDomDataset(el, "item-id");
      const item = (itemId && actor.getOwnedItem(itemId)) as Item<RuneItemData>;
      if (item && item.sheet) {
        item.sheet.render(true);
      } else {
        logBug(
          `Couldn't find itemId [${itemId}] on actor ${actor.name} to edit the rune item from the rune context menu.`,
          true,
          el
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
          `Couldn't find itemId [${itemId}] on actor ${actor.name} to delete the rune item from the rune context menu.`,
          true,
          el
        );
      }
    },
  },
];
