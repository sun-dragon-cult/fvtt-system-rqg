import { Ability } from "../../data-model/shared/ability";
import { RqgActorSheet } from "../rqgActorSheet";
import { RuneMagicItemData } from "../../data-model/item-data/runeMagicData";
import { RqgActor } from "../rqgActor";
import { getDomDataset, logBug } from "../../system/util";

export const runeMagicMenuOptions = (actor: RqgActor) => [
  {
    name: "Roll",
    icon: '<i class="fas fa-dice-d20"></i>',
    condition: () => true,
    callback: async (el: JQuery) => {
      const itemId = getDomDataset(el, "item-id");
      const item = (itemId && actor.getOwnedItem(itemId)) as Item<RuneMagicItemData>;
      if (item) {
        await Ability.roll(actor, item.data.data.chance, 0, item.name);
      } else {
        logBug(
          `Couldn't find itemId [${itemId}] on actor ${actor.name} to roll for RuneMagic item from the runemagic context menu.`,
          true
        );
      }
    },
  },
  {
    name: "View Description",
    icon: '<i class="fas fa-book-open"></i>',
    condition: (el: JQuery) => {
      const itemId = getDomDataset(el, "item-id");
      let firstItemEl = el[0];
      while ((firstItemEl?.previousElementSibling as HTMLElement)?.dataset?.itemId === itemId) {
        firstItemEl = firstItemEl?.previousElementSibling as HTMLElement;
      }
      return !!firstItemEl?.dataset?.journalId;
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
          `Couldn't find itemId [${itemId}] or journalId on actor ${actor.name} to view description of a rune magic item from the runemagic context menu.`,
          true
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
      const item = (itemId && actor.getOwnedItem(itemId)) as Item<RuneMagicItemData>;
      if (item && item.sheet) {
        item.sheet.render(true);
      } else {
        logBug(
          `Couldn't find itemId [${itemId}] on actor ${actor.name} to edit the runemagic item from the runemagic context menu.`,
          true
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
          `Couldn't find itemId [${itemId}] on actor ${actor.name} to delete the runemagic item from the runemagic context menu.`,
          true
        );
      }
    },
  },
];
