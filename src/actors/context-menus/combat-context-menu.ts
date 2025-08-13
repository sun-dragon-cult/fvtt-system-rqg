import { RqgActorSheet } from "../rqgActorSheet";
import { RqgActor } from "../rqgActor";
import {
  assertItemType,
  getDomDataset,
  getRequiredDomDataset,
  localize,
  localizeItemType,
  RqgError,
} from "../../system/util";
import { contextMenuRunes } from "./contextMenuRunes";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import type { RqgItem } from "../../items/rqgItem";

export const combatMenuOptions = (actor: RqgActor): ContextMenu.Item[] => [
  {
    name: localize("RQG.Game.InitiateCombat"),
    icon: contextMenuRunes.RollViaChat,
    condition: (el: JQuery) => !!getDomDataset(el, "weapon-item-id"),
    callback: async (el: JQuery) => {
      const weaponItemId = getRequiredDomDataset(el, "weapon-item-id");
      const weapon = actor.getEmbeddedDocument("Item", weaponItemId) as RqgItem | undefined;
      assertItemType(weapon?.type, ItemTypeEnum.Weapon);
      await weapon.attack();
    },
  },
  {
    name: localize("RQG.ContextMenu.ToggleExperience"),
    icon: contextMenuRunes.ToggleExperience,
    condition: (el: JQuery) => !!getDomDataset(el, "skill-id"),
    callback: async (el: JQuery) => {
      const itemId = getDomDataset(el, "skill-id");
      const item = itemId && actor.items.get(itemId);
      if (!item || !("hasExperience" in item.system)) {
        const msg = localize("RQG.ContextMenu.Notification.CantToggleExperienceError", {
          itemId: itemId,
          actorName: actor.name,
        });
        ui.notifications?.error(msg);
        throw new RqgError(msg);
      }
      const toggledExperience = !item.system.hasExperience;
      await item.update({ "system.hasExperience": toggledExperience }, {});
    },
  },
  {
    name: localize("RQG.ContextMenu.EditItem", {
      itemType: localizeItemType(ItemTypeEnum.Skill),
    }),
    icon: contextMenuRunes.Edit,
    condition: (el: JQuery) => !!game.user?.isGM && !!getDomDataset(el, "skill-id"),
    callback: (el: JQuery) => {
      const skillItemId = getDomDataset(el, "skill-id");
      const skillItem = skillItemId && actor.items.get(skillItemId);
      if (!skillItem || !skillItem.sheet) {
        const msg = localize("RQG.ContextMenu.Notification.CantShowItemSheetError", {
          skillItemId: skillItemId,
          actorName: actor.name,
        });
        ui.notifications?.error(msg);
        throw new RqgError(msg);
      }
      skillItem.sheet.render(true);
      return;
    },
  },
  {
    name: localize("RQG.ContextMenu.EditItem", {
      itemType: localizeItemType(ItemTypeEnum.Weapon),
    }),
    icon: contextMenuRunes.Edit,
    condition: () => !!game.user?.isGM,
    callback: (el: JQuery) => {
      const weaponItemId = getDomDataset(el, "weapon-item-id");
      const item = weaponItemId && actor.items.get(weaponItemId);
      if (!item || !item.sheet) {
        const msg = localize("RQG.ContextMenu.Notification.CantShowWeaponSheetError", {
          weaponItemId: weaponItemId,
          actorName: actor.name,
        });
        ui.notifications?.error(msg);
        throw new RqgError(msg);
      }
      item.sheet.render(true);
    },
  },
  {
    name: localize("RQG.ContextMenu.DeleteItem", {
      itemType: localizeItemType(ItemTypeEnum.Skill),
    }),
    icon: contextMenuRunes.Delete,
    condition: (el: JQuery) => !!game.user?.isGM && !!getDomDataset(el, "skill-id"),
    callback: (el: JQuery) => {
      const skillItemId = getDomDataset(el, "skill-id");
      if (skillItemId) {
        void RqgActorSheet.confirmItemDelete(actor, skillItemId);
      } else {
        const msg = localize("RQG.ContextMenu.Notification.CantDeleteSkillError", {
          weaponItemId: skillItemId,
          actorName: actor.name,
        });
        ui.notifications?.error(msg);
        throw new RqgError(msg);
      }
    },
  },
  {
    name: localize("RQG.ContextMenu.DeleteItem", {
      itemType: localizeItemType(ItemTypeEnum.Weapon),
    }),
    icon: contextMenuRunes.Delete,
    condition: () => !!game.user?.isGM,
    callback: (el: JQuery) => {
      const weaponItemId = getDomDataset(el, "weapon-item-id");
      if (weaponItemId) {
        void RqgActorSheet.confirmItemDelete(actor, weaponItemId);
      } else {
        const msg = localize("RQG.ContextMenu.Notification.CantDeleteWeaponError", {
          weaponItemId: weaponItemId,
          actorName: actor.name,
        });
        ui.notifications?.error(msg);
        throw new RqgError(msg);
      }
    },
  },
];
