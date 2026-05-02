import type { RqgContextMenuEntry } from "../../foundryUi/RqgContextMenu";
import { RqgActorSheet } from "../rqgActorSheet";
import { RqgActor } from "../rqgActor";
import {
  assertDocumentSubType,
  getDomDataset,
  getRequiredDomDataset,
  isDocumentSubType,
  localize,
  localizeItemType,
  RqgError,
} from "../../system/util";
import { ItemTypeEnum } from "@item-model/itemTypes.ts";
import { SkillCategoryEnum, type SkillItem } from "@item-model/skillDataModel.ts";
import { showImproveAbilityDialog } from "../../applications/improveAbilityDialog";
import { contextMenuRunes } from "./contextMenuRunes";
import { Rqid } from "../../system/api/rqidApi";
import { isValidRqidString } from "../../system/api/rqidValidation";
import { ActorTypeEnum, type CharacterActor } from "../../data-model/actor-data/rqgActorData.ts";

export const skillMenuOptions = (
  actor: RqgActor,
  token: TokenDocument | undefined,
): RqgContextMenuEntry[] => [
  {
    label: localize("RQG.Game.RollChat"),
    icon: contextMenuRunes.RollViaChat,
    visible: (el: HTMLElement) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId) as SkillItem | undefined;
      assertDocumentSubType<SkillItem>(item, ItemTypeEnum.Skill);
      return !(
        [SkillCategoryEnum.MeleeWeapons, SkillCategoryEnum.MissileWeapons] as SkillCategoryEnum[]
      ).includes(item.system.category);
    },
    onClick: async (_event: Event, el: HTMLElement) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId) as SkillItem | undefined;
      assertDocumentSubType<SkillItem>(item, ItemTypeEnum.Skill);
      await item.abilityRoll();
    },
  },
  {
    label: localize("RQG.Game.RollQuick"),
    icon: contextMenuRunes.RollQuick,
    visible: (el: HTMLElement) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId) as SkillItem | undefined;
      assertDocumentSubType<SkillItem>(item, ItemTypeEnum.Skill);
      return !(
        [SkillCategoryEnum.MeleeWeapons, SkillCategoryEnum.MissileWeapons] as SkillCategoryEnum[]
      ).includes(item.system.category);
    },
    onClick: async (_event: Event, el: HTMLElement) => {
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
    label: localize("RQG.ContextMenu.ToggleExperience"),
    icon: contextMenuRunes.ToggleExperience,
    visible: (el: HTMLElement) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId) as SkillItem | undefined;
      assertDocumentSubType<SkillItem>(item, ItemTypeEnum.Skill);
      return item.system.canGetExperience;
    },
    onClick: async (_event: Event, el: HTMLElement) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId) as SkillItem | undefined;
      assertDocumentSubType<SkillItem>(item, ItemTypeEnum.Skill);
      await item.update({ system: { hasExperience: !item.system.hasExperience } }, {});
    },
  },
  {
    label: localize("RQG.ContextMenu.ImproveItem", {
      itemType: localizeItemType(ItemTypeEnum.Skill),
    }),
    icon: contextMenuRunes.Improve,
    visible: (el: HTMLElement) => {
      const itemId = getDomDataset(el, "item-id");
      const item = actor.items.get(itemId ?? "") as SkillItem | undefined;
      return isDocumentSubType<SkillItem>(item, ItemTypeEnum.Skill);
    },
    onClick: async (_event: Event, el: HTMLElement) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      assertDocumentSubType<CharacterActor>(actor, ActorTypeEnum.Character);

      const item = actor.items.get(itemId) as SkillItem | undefined;
      assertDocumentSubType<SkillItem>(item, ItemTypeEnum.Skill);

      const speaker = ChatMessage.getSpeaker({ actor, token });
      await showImproveAbilityDialog(item, speaker);
    },
  },
  {
    label: localize("RQG.ContextMenu.ViewDescription"),
    icon: contextMenuRunes.ViewDescription,
    visible: (el: HTMLElement) => {
      const itemId = getDomDataset(el, "item-id");
      const item = actor.items.get(itemId ?? "") as SkillItem | undefined;
      return isValidRqidString(item?.system.descriptionRqidLink?.rqid);
    },
    onClick: async (_event: Event, el: HTMLElement) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = actor.items.get(itemId) as SkillItem | undefined;
      const rqid = item?.system.descriptionRqidLink?.rqid;
      if (isValidRqidString(rqid)) {
        await Rqid.renderRqidDocument(rqid);
      }
    },
  },
  {
    label: localize("RQG.ContextMenu.EditItem", {
      itemType: localizeItemType(ItemTypeEnum.Skill),
    }),
    icon: contextMenuRunes.Edit,
    visible: (el: HTMLElement) => !!getRequiredDomDataset(el, "item-id"),
    onClick: (_event: Event, el: HTMLElement) => {
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
    label: localize("RQG.ContextMenu.DeleteItem", {
      itemType: localizeItemType(ItemTypeEnum.Skill),
    }),
    icon: contextMenuRunes.Delete,
    visible: () => !!game.user?.isGM,
    onClick: (_event: Event, el: HTMLElement) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      void RqgActorSheet.confirmItemDelete(actor, itemId);
    },
  },
];
