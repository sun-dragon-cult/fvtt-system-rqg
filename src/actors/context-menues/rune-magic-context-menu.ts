import { Ability } from "../../data-model/shared/ability";
import { RqgActorSheet } from "../rqgActorSheet";
import { RqgActor } from "../rqgActor";
import { getDomDataset, getRequiredDomDataset, RqgError } from "../../system/util";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";

export const runeMagicMenuOptions = (actor: RqgActor, token: Token | null): ContextMenu.Item[] => [
  {
    name: "Roll",
    icon: '<i class="fas fa-dice-d20"></i>',
    condition: () => true,
    callback: async (el: JQuery) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId);
      if (!item || item.data.type !== ItemTypeEnum.RuneMagic) {
        const msg = `Couldn't find itemId [${itemId}] on actor ${actor.name} to roll for RuneMagic item from the runemagic context menu.`;
        ui.notifications?.error(msg);
        throw new RqgError(msg);
      }
      const speakerName = token?.name || actor.data.token.name;
      await Ability.roll(item.name, item.data.data.chance, 0, speakerName);
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
      const item = actor.items.get(itemId);
      if (!item || !item.sheet) {
        const msg = `Couldn't find itemId [${itemId}] on actor ${actor.name} to edit the runemagic item from the runemagic context menu.`;
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
