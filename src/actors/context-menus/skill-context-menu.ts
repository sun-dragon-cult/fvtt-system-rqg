import { RqgActorSheet } from "../rqgActorSheet";
import { ItemCard } from "../../chat/itemCard";
import { RqgActor } from "../rqgActor";
import {
  assertItemType,
  findDatasetValueInSelfOrAncestors,
  getDomDataset,
  getGame,
  getRequiredDomDataset,
  localize,
  RqgError,
} from "../../system/util";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { SkillCategoryEnum } from "../../data-model/item-data/skillData";
import { showImproveAbilityDialog } from "../../dialog/improveAbilityDialog";
import { ContextMenuRunes } from "./contextMenuRunes";
import { RqgItem } from "../../items/rqgItem";
import { Rqid } from "../../system/api/rqidApi";

export const skillMenuOptions = (
  actor: RqgActor,
  token: TokenDocument | undefined
): ContextMenu.Item[] => [
  {
    name: localize("RQG.Game.RollCard"),
    icon: ContextMenuRunes.RollCard,
    condition: (el: JQuery) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId);
      assertItemType(item?.data.type, ItemTypeEnum.Skill);
      return ![SkillCategoryEnum.MeleeWeapons, SkillCategoryEnum.MissileWeapons].includes(
        item.data.data.category
      );
    },
    callback: async (el: JQuery) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      await ItemCard.show(itemId, actor, token);
    },
  },
  {
    name: localize("RQG.Game.RollQuick"),
    icon: ContextMenuRunes.RollQuick,
    condition: (el: JQuery) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId);
      assertItemType(item?.data.type, ItemTypeEnum.Skill);
      return ![SkillCategoryEnum.MeleeWeapons, SkillCategoryEnum.MissileWeapons].includes(
        item.data.data.category
      );
    },
    callback: async (el: JQuery) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId);
      assertItemType(item?.data.type, ItemTypeEnum.Skill);
      const itemChance = item.data.data.chance;
      if (!itemChance) {
        const msg = localize("RQG.ContextMenu.Notification.CantRollQuickSkillError", {
          itemId: itemId,
          actorName: actor.name,
        });
        ui.notifications?.error(msg);
        throw new RqgError(msg, el);
      }
      await ItemCard.roll(item, 0, actor, ChatMessage.getSpeaker({ actor: actor, token: token }));
    },
  },
  {
    name: localize("RQG.ContextMenu.ToggleExperience"),
    icon: ContextMenuRunes.ToggleExperience,
    condition: (el: JQuery) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId);
      assertItemType(item?.data.type, ItemTypeEnum.Skill);
      return item.data.data.canGetExperience;
    },
    callback: async (el: JQuery) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId);
      assertItemType(item?.data.type, ItemTypeEnum.Skill);
      await item.update({ "data.hasExperience": !item.data.data.hasExperience }, {});
    },
  },
  {
    name: localize("RQG.ContextMenu.ImproveItem", {
      itemType: RqgItem.localizeItemTypeName(ItemTypeEnum.Skill),
    }),
    icon: ContextMenuRunes.Improve,
    condition: (el: JQuery) => {
      const itemId = getDomDataset(el, "item-id");
      const item = itemId && actor.items.get(itemId);
      return !!(item && item.data.type === ItemTypeEnum.Skill);
    },
    callback: async (el: JQuery) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId);
      assertItemType(item?.data.type, ItemTypeEnum.Skill);
      const speakerName = token?.name ?? actor.data.token.name ?? "";
      showImproveAbilityDialog(actor, itemId, item, speakerName);
    },
  },
  {
    name: localize("RQG.ContextMenu.ViewDescription"),
    icon: ContextMenuRunes.ViewDescription,
    condition: (el: JQuery) => {
      const rqid = findDatasetValueInSelfOrAncestors(el[0] as HTMLElement, "skillRqid");
      return !!rqid;
    },
    callback: async (el: JQuery) => {
      const rqid = findDatasetValueInSelfOrAncestors(el[0] as HTMLElement, "skillRqid");
      if (rqid) {
        await Rqid.renderRqidDocument(rqid);
      }
    },
  },
  {
    name: localize("RQG.ContextMenu.EditItem", {
      itemType: RqgItem.localizeItemTypeName(ItemTypeEnum.Skill),
    }),
    icon: ContextMenuRunes.Edit,
    condition: () => !!getGame().user?.isGM,
    callback: (el: JQuery) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId);
      assertItemType(item?.data.type, ItemTypeEnum.Skill);
      if (!item.sheet) {
        const msg = `Couldn't find sheet on [${item.name}] on actor ${actor.name} to edit the skill item from the skill context menu`;
        ui.notifications?.error(msg);
        throw new RqgError(msg, el);
      }
      item.sheet.render(true);
    },
  },
  {
    name: localize("RQG.ContextMenu.DeleteItem", {
      itemType: RqgItem.localizeItemTypeName(ItemTypeEnum.Skill),
    }),
    icon: ContextMenuRunes.Delete,
    condition: () => !!getGame().user?.isGM,
    callback: (el: JQuery) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      RqgActorSheet.confirmItemDelete(actor, itemId);
    },
  },
];
