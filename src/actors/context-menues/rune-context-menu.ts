import { Ability } from "../../data-model/shared/ability";
import { RqgActorSheet } from "../rqgActorSheet";
import { RuneItemData } from "../../data-model/item-data/runeData";
import { RqgActor } from "../rqgActor";
import { getDomDataset, getRequiredDomDataset, RqgError } from "../../system/util";

export const runeMenuOptions = (actor: RqgActor, token: Token | null): ContextMenu.Item[] => [
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
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.getOwnedItem(itemId) as Item<RuneItemData>;
      const itemChance = item && item.data.data.chance;
      if (itemChance == null) {
        const msg = `Couldn't find itemId [${itemId}] or item chance on actor ${actor.name} to do a direct roll on the rune item from the rune context menu.`;
        ui.notifications?.error(msg);
        throw new RqgError(msg);
      }
      const speakerName = token?.name || actor.data.token.name;
      await Ability.roll(item.name, itemChance, 0, speakerName);
    },
  },
  {
    name: "Toggle Experience",
    icon: '<i class="fas fa-lightbulb"></i>',
    condition: () => true,
    callback: async (el: JQuery) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.getOwnedItem(itemId) as Item<RuneItemData>;
      if (!item) {
        const msg = `Couldn't find itemId [${itemId}] on actor ${actor.name} to toggle experience on a passion item from the passion context menu.`;
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
      const item = actor.getOwnedItem(itemId) as Item<RuneItemData>;
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
      const itemId = getRequiredDomDataset(el, "item-id");
      let firstItemEl = el[0];
      while ((firstItemEl?.previousElementSibling as HTMLElement)?.dataset?.itemId === itemId) {
        firstItemEl = firstItemEl.previousElementSibling as HTMLElement;
      }
      return !!getDomDataset($(firstItemEl), "journal-id");
    },
    callback: async (el: JQuery) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      let firstItemEl = el[0];
      while ((firstItemEl?.previousElementSibling as HTMLElement)?.dataset?.itemId === itemId) {
        firstItemEl = firstItemEl?.previousElementSibling as HTMLElement;
      }
      const journalId = getRequiredDomDataset($(firstItemEl), "journal-id");
      const journalPack = getDomDataset($(firstItemEl), "journal-pack");
      await RqgActorSheet.showJournalEntry(journalId, journalPack);
    },
  },
  {
    name: "Edit",
    icon: '<i class="fas fa-edit"></i>',
    condition: () => !!game.user?.isGM,
    callback: (el: JQuery) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.getOwnedItem(itemId) as Item<RuneItemData>;
      if (!item || !item.sheet) {
        const msg = `Couldn't find itemId [${itemId}] on actor ${actor.name} to edit the rune item from the rune context menu.`;
        ui.notifications?.error(msg);
        throw new RqgError(msg, el);
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
