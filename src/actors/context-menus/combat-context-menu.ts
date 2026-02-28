import { RqgActorSheet } from "../rqgActorSheet";
import {
  assertDocumentSubType,
  getDomDataset,
  getRequiredDomDataset,
  localize,
  localizeItemType,
  RqgError,
} from "../../system/util";
import { contextMenuRunes } from "./contextMenuRunes";
import { ItemTypeEnum } from "@item-model/itemTypes.ts";
import type { WeaponItem } from "@item-model/weaponData.ts";
import type { CharacterActor } from "../../data-model/actor-data/rqgActorData.ts";
import type { SkillItem } from "@item-model/skillData.ts";

export const combatMenuOptions = (actor: CharacterActor): ContextMenu.Entry<HTMLElement>[] => [
  {
    name: localize("RQG.Game.InitiateCombat"),
    icon: contextMenuRunes.RollViaChat,
    condition: (el: HTMLElement) => !!getDomDataset(el, "weapon-item-id"),
    callback: async (el: HTMLElement) => {
      const weaponItemId = getRequiredDomDataset(el, "weapon-item-id");
      const weapon = actor.getEmbeddedDocument("Item", weaponItemId, {});
      assertDocumentSubType<WeaponItem>(weapon, ItemTypeEnum.Weapon);
      await weapon?.attack();
    },
  },
  {
    name: localize("RQG.ContextMenu.ToggleExperience"),
    icon: contextMenuRunes.ToggleExperience,
    condition: (el: HTMLElement) => !!getDomDataset(el, "skill-id"),
    callback: async (el: HTMLElement) => {
      const itemId = getDomDataset(el, "skill-id");
      const item = actor.items.get(itemId ?? "") as SkillItem | undefined;
      if (!item || !("hasExperience" in item.system)) {
        const msg = localize("RQG.ContextMenu.Notification.CantToggleExperienceError", {
          itemId: itemId!,
          actorName: actor.name,
        });
        ui.notifications?.error(msg);
        throw new RqgError(msg);
      }
      const toggledExperience = !item.system.hasExperience;
      await item.update({ system: { hasExperience: toggledExperience } }, {});
    },
  },
  {
    name: localize("RQG.ContextMenu.EditItem", {
      itemType: localizeItemType(ItemTypeEnum.Skill),
    }),
    icon: contextMenuRunes.Edit,
    condition: (el: HTMLElement) => !!game.user?.isGM && !!getDomDataset(el, "skill-id"),
    callback: (el: HTMLElement) => {
      const skillItemId = getDomDataset(el, "skill-id");
      const skillItem = actor.items.get(skillItemId ?? "") as SkillItem | undefined;
      if (!skillItem || !skillItem.sheet) {
        const msg = localize("RQG.ContextMenu.Notification.CantShowItemSheetError", {
          skillItemId: skillItemId!,
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
    callback: (el: HTMLElement) => {
      const weaponItemId = getDomDataset(el, "weapon-item-id");
      const item = actor.items.get(weaponItemId ?? "") as WeaponItem | undefined;
      if (!item || !item.sheet) {
        const msg = localize("RQG.ContextMenu.Notification.CantShowWeaponSheetError", {
          weaponItemId: weaponItemId!,
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
    condition: (el: HTMLElement) => !!game.user?.isGM && !!getDomDataset(el, "skill-id"),
    callback: (el: HTMLElement) => {
      const skillItemId = getDomDataset(el, "skill-id");
      if (skillItemId) {
        void RqgActorSheet.confirmItemDelete(actor, skillItemId);
      } else {
        const msg = localize("RQG.ContextMenu.Notification.CantDeleteSkillError", {
          weaponItemId: skillItemId ?? "",
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
    callback: (el: HTMLElement) => {
      const weaponItemId = getDomDataset(el, "weapon-item-id");
      if (weaponItemId) {
        void RqgActorSheet.confirmItemDelete(actor, weaponItemId);
      } else {
        const msg = localize("RQG.ContextMenu.Notification.CantDeleteWeaponError", {
          weaponItemId: weaponItemId ?? "",
          actorName: actor.name,
        });
        ui.notifications?.error(msg);
        throw new RqgError(msg);
      }
    },
  },
];
