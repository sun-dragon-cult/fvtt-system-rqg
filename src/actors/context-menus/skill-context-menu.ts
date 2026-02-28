import { RqgActorSheet } from "../rqgActorSheet";
import { RqgActor } from "../rqgActor";
import {
  assertDocumentSubType,
  getDomDataset,
  getDomDatasetAmongSiblings,
  getRequiredDomDataset,
  isDocumentSubType,
  localize,
  localizeItemType,
  RqgError,
} from "../../system/util";
import { ItemTypeEnum } from "@item-model/itemTypes.ts";
import { SkillCategoryEnum, type SkillItem } from "@item-model/skillData.ts";
import { showImproveAbilityDialog } from "../../applications/improveAbilityDialog";
import { contextMenuRunes } from "./contextMenuRunes";
import { Rqid } from "../../system/api/rqidApi";
import { ActorTypeEnum, type CharacterActor } from "../../data-model/actor-data/rqgActorData.ts";

export const skillMenuOptions = (
  actor: RqgActor,
  token: TokenDocument | undefined,
): ContextMenu.Entry<HTMLElement>[] => [
  {
    name: localize("RQG.Game.RollChat"),
    icon: contextMenuRunes.RollViaChat,
    condition: (el: HTMLElement) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId) as SkillItem | undefined;
      assertDocumentSubType<SkillItem>(item, ItemTypeEnum.Skill);
      return ![SkillCategoryEnum.MeleeWeapons, SkillCategoryEnum.MissileWeapons].includes(
        item.system.category,
      );
    },
    callback: async (el: HTMLElement) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId) as SkillItem | undefined;
      assertDocumentSubType<SkillItem>(item, ItemTypeEnum.Skill);
      await item.abilityRoll();
    },
  },
  {
    name: localize("RQG.Game.RollQuick"),
    icon: contextMenuRunes.RollQuick,
    condition: (el: HTMLElement) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId) as SkillItem | undefined;
      assertDocumentSubType<SkillItem>(item, ItemTypeEnum.Skill);
      return ![SkillCategoryEnum.MeleeWeapons, SkillCategoryEnum.MissileWeapons].includes(
        item.system.category,
      );
    },
    callback: async (el: HTMLElement) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId) as SkillItem | undefined;
      assertDocumentSubType<SkillItem>(item, ItemTypeEnum.Skill);
      const itemChance = item.system.chance;
      if (itemChance == null) {
        const msg = localize("RQG.ContextMenu.Notification.CantRollQuickSkillError", {
          itemId: itemId,
          actorName: actor.name,
        });
        ui.notifications?.error(msg);
        throw new RqgError(msg, el);
      }
      await item.abilityRollImmediate();
    },
  },
  {
    name: localize("RQG.ContextMenu.ToggleExperience"),
    icon: contextMenuRunes.ToggleExperience,
    condition: (el: HTMLElement) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId) as SkillItem | undefined;
      assertDocumentSubType<SkillItem>(item, ItemTypeEnum.Skill);
      return item.system.canGetExperience;
    },
    callback: async (el: HTMLElement) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId) as SkillItem | undefined;
      assertDocumentSubType<SkillItem>(item, ItemTypeEnum.Skill);
      await item.update({ system: { hasExperience: !item.system.hasExperience } }, {});
    },
  },
  {
    name: localize("RQG.ContextMenu.ImproveItem", {
      itemType: localizeItemType(ItemTypeEnum.Skill),
    }),
    icon: contextMenuRunes.Improve,
    condition: (el: HTMLElement) => {
      const itemId = getDomDataset(el, "item-id");
      const item = actor.items.get(itemId ?? "") as SkillItem | undefined;
      return isDocumentSubType<SkillItem>(item, ItemTypeEnum.Skill);
    },
    callback: async (el: HTMLElement) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      assertDocumentSubType<CharacterActor>(actor, ActorTypeEnum.Character);

      const item = actor.items.get(itemId) as SkillItem | undefined;
      assertDocumentSubType<SkillItem>(item, ItemTypeEnum.Skill);

      const speaker = ChatMessage.getSpeaker({ actor, token });
      await showImproveAbilityDialog(item, speaker);
    },
  },
  {
    name: localize("RQG.ContextMenu.ViewDescription"),
    icon: contextMenuRunes.ViewDescription,
    condition: (el: HTMLElement) => {
      const rqid = getDomDatasetAmongSiblings(el, "rqid-link");
      return !!rqid;
    },
    callback: async (el: HTMLElement) => {
      const rqid = getDomDatasetAmongSiblings(el, "rqid-link");
      if (rqid) {
        await Rqid.renderRqidDocument(rqid);
      }
    },
  },
  {
    name: localize("RQG.ContextMenu.EditItem", {
      itemType: localizeItemType(ItemTypeEnum.Skill),
    }),
    icon: contextMenuRunes.Edit,
    condition: (el: HTMLElement) => !!getRequiredDomDataset(el, "item-id"),
    callback: (el: HTMLElement) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId) as SkillItem | undefined;
      assertDocumentSubType<SkillItem>(item, ItemTypeEnum.Skill);
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
      itemType: localizeItemType(ItemTypeEnum.Skill),
    }),
    icon: contextMenuRunes.Delete,
    condition: () => !!game.user?.isGM,
    callback: (el: HTMLElement) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      void RqgActorSheet.confirmItemDelete(actor, itemId);
    },
  },
];
