import { RqgActorSheet } from "../rqgActorSheet";
import { WeaponCard } from "../../chat/weaponCard";
import { RqgActor } from "../rqgActor";
import { getDomDataset, getGame, getRequiredDomDataset, RqgError } from "../../system/util";
import { ContextMenuRunes } from "./contextMenuRunes";

export const combatMenuOptions = (
  actor: RqgActor,
  token: TokenDocument | null
): ContextMenu.Item[] => [
  {
    name: "Roll (click)",
    icon: ContextMenuRunes.RollCard,
    condition: (el) => !!getDomDataset(el, "weapon-roll"),
    callback: async (el: JQuery) => {
      const skillItemId = getDomDataset(el, "skill-id");
      const weaponItemId = getDomDataset(el, "item-id");
      const usage = getRequiredDomDataset(el, "weapon-roll");
      if (skillItemId && weaponItemId) {
        await WeaponCard.show(weaponItemId, usage, skillItemId, actor, token);
      } else {
        const msg = `Couldn't find skillId [${skillItemId}] or weaponId [${weaponItemId}] on actor ${actor.name} to show the weapon chat card from the combat context menu.`;
        ui.notifications?.error(msg);
        throw new RqgError(msg);
      }
    },
  },
  {
    name: "Toggle Experience",
    icon: ContextMenuRunes.ToggleExperience,
    condition: () => true,
    callback: async (el: JQuery) => {
      const itemId = getDomDataset(el, "skill-id");
      const item = itemId && actor.items.get(itemId);
      if (!item || !("hasExperience" in item.data.data)) {
        const msg = `Couldn't find itemId [${itemId}] on actor ${actor.name} to toggle experience from the combat context menu.`;
        ui.notifications?.error(msg);
        throw new RqgError(msg);
      }
      const toggledExperience = !item.data.data.hasExperience;
      await item.update({ "data.hasExperience": toggledExperience }, {});
    },
  },
  {
    name: "Edit Skill",
    icon: ContextMenuRunes.Edit,
    condition: () => !!getGame().user?.isGM,
    callback: (el: JQuery) => {
      const skillItemId = getDomDataset(el, "skill-id");
      const skillItem = skillItemId && actor.items.get(skillItemId);
      if (!skillItem || !skillItem.sheet) {
        const msg = `Couldn't find itemId [${skillItemId}] on actor ${actor.name} to show skill Item sheet from the combat context menu.`;
        ui.notifications?.error(msg);
        throw new RqgError(msg);
      }
      skillItem.sheet.render(true);
      return;
    },
  },
  {
    name: "Edit Weapon",
    icon: ContextMenuRunes.Edit,
    condition: () => !!getGame().user?.isGM,
    callback: (el: JQuery) => {
      const weaponItemId = getDomDataset(el, "item-id");
      const item = weaponItemId && actor.items.get(weaponItemId);
      if (!item || !item.sheet) {
        const msg = `Couldn't find itemId [${weaponItemId}] on actor ${actor.name} to show weapon item sheet from the combat context menu.`;
        ui.notifications?.error(msg);
        throw new RqgError(msg);
      }
      item.sheet.render(true);
    },
  },
  {
    name: "Delete Skill",
    icon: ContextMenuRunes.Delete,
    condition: () => !!getGame().user?.isGM,
    callback: (el: JQuery) => {
      const skillItemId = getDomDataset(el, "skill-id");
      if (skillItemId) {
        RqgActorSheet.confirmItemDelete(actor, skillItemId);
      } else {
        const msg = `Couldn't find itemId [${skillItemId}] on actor ${actor.name} to delete skill item from the combat context menu.`;
        ui.notifications?.error(msg);
        throw new RqgError(msg);
      }
    },
  },
  {
    name: "Delete Weapon",
    icon: ContextMenuRunes.Delete,
    condition: () => !!getGame().user?.isGM,
    callback: (el: JQuery) => {
      const weaponItemId = getDomDataset(el, "item-id");
      if (weaponItemId) {
        RqgActorSheet.confirmItemDelete(actor, weaponItemId);
      } else {
        const msg = `Couldn't find itemId [${weaponItemId}] on actor ${actor.name} to delete weapon item from the combat context menu.`;
        ui.notifications?.error(msg);
        throw new RqgError(msg);
      }
    },
  },
];
