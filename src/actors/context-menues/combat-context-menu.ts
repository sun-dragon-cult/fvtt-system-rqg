import { RqgActorSheet } from "../rqgActorSheet";
import { WeaponCard } from "../../chat/weaponCard";
import { RqgActor } from "../rqgActor";
import { getDomDataset, logBug } from "../../system/util";

export const combatMenuOptions = (
  token: Token | undefined,
  actor: RqgActor
): ContextMenu.Item[] => [
  {
    name: "Roll (click)",
    icon: '<i class="fas fa-dice-d20"></i>',
    condition: () => !!token,
    callback: async (el: JQuery) => {
      const skillItemId = getDomDataset(el, "skill-id");
      const weaponItemId = getDomDataset(el, "item-id");
      if (skillItemId && weaponItemId) {
        await WeaponCard.show(token!, skillItemId, weaponItemId);
      } else {
        logBug(
          `Couldn't find skillId [${skillItemId}] or weaponId [${weaponItemId}] on actor ${
            token!.name
          } to show the weapon chat card from the combat context menu.`,
          true
        );
      }
    },
  },
  {
    name: "Toggle Experience",
    icon: '<i class="fas fa-lightbulb"></i>',
    condition: () => !!token,
    callback: async (el: JQuery) => {
      const itemId = getDomDataset(el, "skill-id");
      const item = itemId && token!.actor.getOwnedItem(itemId);
      if (item && "hasExperience" in item.data.data) {
        const toggledExperience = !item.data.data.hasExperience;
        await item.update({ "data.hasExperience": toggledExperience }, {});
      } else {
        logBug(
          `Couldn't find itemId [${itemId}] on actor ${
            token!.name
          } to toggle experience from the combat context menu.`,
          true
        );
      }
    },
  },
  {
    name: "Edit Skill",
    icon: '<i class="fas fa-edit"></i>',
    condition: () => !!game.user?.isGM,
    callback: (el: JQuery) => {
      const skillItemId = getDomDataset(el, "skill-id");
      const skillItem = skillItemId && actor.getOwnedItem(skillItemId);
      if (skillItem && skillItem.sheet) {
        skillItem.sheet.render(true);
        return;
      } else {
        logBug(
          `Couldn't find itemId [${skillItemId}] on actor ${actor.name} to show skill Item sheet from the combat context menu.`,
          true
        );
      }
    },
  },
  {
    name: "Edit Weapon",
    icon: '<i class="fas fa-edit"></i>',
    condition: () => !!game.user?.isGM,
    callback: (el: JQuery) => {
      const weaponItemId = getDomDataset(el, "item-id");
      const item = weaponItemId && actor.getOwnedItem(weaponItemId);
      if (item && item.sheet) {
        item.sheet.render(true);
      } else {
        logBug(
          `Couldn't find itemId [${weaponItemId}] on actor ${actor.name} to show weapon item sheet from the combat context menu.`,
          true
        );
      }
    },
  },
  {
    name: "Delete Skill",
    icon: '<i class="fas fa-trash"></i>',
    condition: () => !!game.user?.isGM,
    callback: (el: JQuery) => {
      const skillItemId = getDomDataset(el, "skill-id");
      if (skillItemId) {
        RqgActorSheet.confirmItemDelete(actor, skillItemId);
      } else {
        logBug(
          `Couldn't find itemId [${skillItemId}] on actor ${actor.name} to delete skill item from the combat context menu.`,
          true
        );
      }
    },
  },
  {
    name: "Delete Weapon",
    icon: '<i class="fas fa-trash"></i>',
    condition: () => !!game.user?.isGM,
    callback: (el: JQuery) => {
      const weaponItemId = getDomDataset(el, "item-id");
      if (weaponItemId) {
        RqgActorSheet.confirmItemDelete(actor, weaponItemId);
      } else {
        logBug(
          `Couldn't find itemId [${weaponItemId}] on actor ${actor.name} to delete weapon item from the combat context menu.`,
          true
        );
      }
    },
  },
];
