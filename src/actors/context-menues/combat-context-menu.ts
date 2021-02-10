import { Ability } from "../../data-model/shared/ability";
import { RqgActorSheet } from "../rqgActorSheet";

export const combatMenuOptions = (actor) => [
  {
    name: "Roll (click)",
    icon: '<i class="fas fa-dice-d20"></i>',
    condition: () => true,
    callback: (el) => {
      ui.notifications.info("TODO Roll with Modifier");
    },
  },
  {
    name: "Direct Roll (dbl click)",
    icon: '<i class="fas fa-dice-d20"></i>',
    condition: () => true,
    callback: (el) => {
      const itemId = (el[0].closest("[data-item-id]") as HTMLElement).dataset.skillId;
      const item: Item = actor.items.get(itemId);
      const result = Ability.rollAgainst(item.data.data.chance, 0, item.name);
    },
  },
  {
    name: "Toggle Experience",
    icon: '<i class="fas fa-lightbulb"></i>',
    condition: () => true,
    callback: async (el) => {
      const itemId = (el[0].closest("[data-skill-id]") as HTMLElement).dataset.skillId;
      const item = actor.getOwnedItem(itemId);
      await item.update({ "data.hasExperience": !item.data.data.hasExperience }, {});
    },
  },
  {
    name: "Edit Skill",
    icon: '<i class="fas fa-edit"></i>',
    condition: () => game.user.isGM,
    callback: (el) => {
      const itemId = (el[0].closest("[data-skill-id]") as HTMLElement).dataset.skillId;
      if (!itemId) {
        ui.notifications.warn("Couldn't find item with id" + itemId);
      }
      actor.getOwnedItem(itemId).sheet.render(true);
    },
  },
  {
    name: "Edit Weapon",
    icon: '<i class="fas fa-edit"></i>',
    condition: () => game.user.isGM,
    callback: (el) => {
      const itemId = (el[0].closest("[data-item-id]") as HTMLElement).dataset.itemId;
      if (!itemId) {
        ui.notifications.warn("Couldn't find item with id " + itemId);
      }
      actor.getOwnedItem(itemId).sheet.render(true);
    },
  },
  {
    name: "Delete Skill",
    icon: '<i class="fas fa-trash"></i>',
    condition: () => game.user.isGM,
    callback: (el) => {
      const itemId = (el[0].closest("[data-skill-id]") as HTMLElement).dataset.skillId;
      if (!itemId) {
        ui.notifications.warn("Couldn't find item with id " + itemId);
      }
      RqgActorSheet.confirmItemDelete(actor, itemId);
    },
  },
  {
    name: "Delete Weapon",
    icon: '<i class="fas fa-trash"></i>',
    condition: () => game.user.isGM,
    callback: (el) => {
      const itemId = (el[0].closest("[data-item-id]") as HTMLElement).dataset.itemId;
      if (!itemId) {
        ui.notifications.warn("Couldn't find item with id " + itemId);
      }
      RqgActorSheet.confirmItemDelete(actor, itemId);
    },
  },
];
