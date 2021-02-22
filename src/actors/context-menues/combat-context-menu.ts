import { RqgActorSheet } from "../rqgActorSheet";
import { WeaponCard } from "../../chat/weaponCard";

export const combatMenuOptions = (actor) => [
  {
    name: "Roll (click)",
    icon: '<i class="fas fa-dice-d20"></i>',
    condition: () => true,
    callback: (el) => {
      const skillId = (el[0].closest("[data-skill-id]") as HTMLElement).dataset.skillId;
      const weaponId = (el[0].closest("[data-item-id]") as HTMLElement).dataset.itemId;

      WeaponCard.show(actor, skillId, weaponId);
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
