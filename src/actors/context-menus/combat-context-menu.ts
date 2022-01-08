import { RqgActorSheet } from "../rqgActorSheet";
import { WeaponCard } from "../../chat/weaponCard";
import { RqgActor } from "../rqgActor";
import { getDomDataset, getGame, getRequiredDomDataset, localize, RqgError } from "../../system/util";
import { ContextMenuRunes } from "./contextMenuRunes";
import { RqgItem } from "../../items/rqgItem";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";

export const combatMenuOptions = (
  actor: RqgActor,
  token: TokenDocument | null
): ContextMenu.Item[] => [
  {
    name: localize("RQG.ContextMenu.RollCard"),
    icon: ContextMenuRunes.RollCard,
    condition: (el) => !!getDomDataset(el, "weapon-roll"),
    callback: async (el: JQuery) => {
      const skillItemId = getDomDataset(el, "skill-id");
      const weaponItemId = getDomDataset(el, "item-id");
      const usage = getRequiredDomDataset(el, "weapon-roll");
      if (skillItemId && weaponItemId) {
        await WeaponCard.show(weaponItemId, usage, skillItemId, actor, token);
      } else {
        const msg = localize("RQG.ContextMenu.Notification.CantShowWeaponChatCardError", {skillItemId: skillItemId, weaponItemId: weaponItemId, actorName: actor.name});
        ui.notifications?.error(msg);
        throw new RqgError(msg);
      }
    },
  },
  {
    name: localize("RQG.ContextMenu.ToggleExperience"),
    icon: ContextMenuRunes.ToggleExperience,
    condition: () => true,
    callback: async (el: JQuery) => {
      const itemId = getDomDataset(el, "skill-id");
      const item = itemId && actor.items.get(itemId);
      if (!item || !("hasExperience" in item.data.data)) {
        const msg = localize("RQG.ContextMenu.Notification.CantToggleExperienceError", {itemId: itemId, actorName: actor.name});
        ui.notifications?.error(msg);
        throw new RqgError(msg);
      }
      const toggledExperience = !item.data.data.hasExperience;
      await item.update({ "data.hasExperience": toggledExperience }, {});
    },
  },
  {
    name: localize("RQG.ContextMenu.EditItem", {itemType: RqgItem.localizeItemTypeName(ItemTypeEnum.Skill)}),
    icon: ContextMenuRunes.Edit,
    condition: () => !!getGame().user?.isGM,
    callback: (el: JQuery) => {
      const skillItemId = getDomDataset(el, "skill-id");
      const skillItem = skillItemId && actor.items.get(skillItemId);
      if (!skillItem || !skillItem.sheet) {
        const msg = localize("RQG.ContextMenu.Notification.CantShowItemSheetError", {skillItemId: skillItemId, actorName: actor.name});
        ui.notifications?.error(msg);
        throw new RqgError(msg);
      }
      skillItem.sheet.render(true);
      return;
    },
  },
  {
    name: localize("RQG.ContextMenu.EditItem", {itemType: RqgItem.localizeItemTypeName(ItemTypeEnum.Weapon)}),
    icon: ContextMenuRunes.Edit,
    condition: () => !!getGame().user?.isGM,
    callback: (el: JQuery) => {
      const weaponItemId = getDomDataset(el, "item-id");
      const item = weaponItemId && actor.items.get(weaponItemId);
      if (!item || !item.sheet) {
        const msg = localize("RQG.ContextMenu.Notification.CantShowWeaponSheetError", {weaponItemId: weaponItemId, actorName: actor.name});
        ui.notifications?.error(msg);
        throw new RqgError(msg);
      }
      item.sheet.render(true);
    },
  },
  {
    name: localize("RQG.ContextMenu.DeleteItem", {itemType: RqgItem.localizeItemTypeName(ItemTypeEnum.Skill)}),
    icon: ContextMenuRunes.Delete,
    condition: () => !!getGame().user?.isGM,
    callback: (el: JQuery) => {
      const skillItemId = getDomDataset(el, "skill-id");
      if (skillItemId) {
        RqgActorSheet.confirmItemDelete(actor, skillItemId);
      } else {
        const msg = localize("RQG.ContextMenu.Notification.CantDeleteSkillError", {weaponItemId: skillItemId, actorName: actor.name});;
        ui.notifications?.error(msg);
        throw new RqgError(msg);
      }
    },
  },
  {
    name: localize("RQG.ContextMenu.DeleteItem", {itemType: RqgItem.localizeItemTypeName(ItemTypeEnum.Weapon)}),
    icon: ContextMenuRunes.Delete,
    condition: () => !!getGame().user?.isGM,
    callback: (el: JQuery) => {
      const weaponItemId = getDomDataset(el, "item-id");
      if (weaponItemId) {
        RqgActorSheet.confirmItemDelete(actor, weaponItemId);
      } else {
        const msg = localize("RQG.ContextMenu.Notification.CantDeleteWeaponError", {weaponItemId: weaponItemId, actorName: actor.name});
        ui.notifications?.error(msg);
        throw new RqgError(msg);
      }
    },
  },
];
