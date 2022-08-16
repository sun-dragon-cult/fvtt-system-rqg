import { EquippedStatus } from "../data-model/item-data/IPhysicalItem";
import {
  getActorFromIds,
  getAvailableRunes,
  getGame,
  hasOwnProperty,
  localize,
  RqgError,
} from "./util";
import { ItemTypeEnum } from "../data-model/item-data/itemTypes";
import { RqgItem } from "../items/rqgItem";
import { RqidLink } from "../data-model/shared/rqidLink";
import { systemId } from "./config";

export const registerHandlebarsHelpers = function () {
  Handlebars.registerHelper("concat", (...strs) =>
    strs.filter((s) => typeof s !== "object").join("")
  );
  Handlebars.registerHelper("json", (context) => JSON.stringify(context));

  /** Workaround since handlebars can't handle ../@key
   * Will create a variable in scope, call with {{setVar 'myvar' @key this}}  */
  Handlebars.registerHelper("setVar", (varName, varValue, scope) => {
    scope[varName] = varValue;
  });

  Handlebars.registerHelper("currency", (value, unit) => {
    return `${new Intl.NumberFormat().format(value)} ${unit}`;
  });

  Handlebars.registerHelper("itemname", (itemId, actorId, tokenId) => {
    const actor = getActorFromIds(actorId, tokenId);
    const item = actor && actor.items.get(itemId);
    return item ? item.data.name : "---";
  });

  Handlebars.registerHelper("localizeitemtype", (typeName) => {
    const itemType: ItemTypeEnum = typeName;
    return RqgItem.localizeItemTypeName(itemType);
  });

  Handlebars.registerHelper("skillname", (itemId, actorId, tokenId) => {
    const actor = getActorFromIds(actorId, tokenId);
    const item = actor && actor.items.get(itemId);
    if (!item) {
      return "---";
    }
    if (item.data.type !== ItemTypeEnum.Skill) {
      const msg = `Handlebar helper "skillname" called with an item that is not a skill`;
      ui.notifications?.error(msg);
      throw new RqgError(msg, item, actor);
    }
    const specialization = item.data.data.specialization
      ? ` (${item.data.data.specialization})`
      : "";
    return `${item.data.data.skillName}${specialization}`;
  });

  Handlebars.registerHelper("skillchance", (itemId, actorId, tokenId) => {
    const actor = getActorFromIds(actorId, tokenId);
    const item = actor && actor.items.get(itemId);
    // @ts-ignore chance
    return item ? item.data.data.chance : "---";
  });

  Handlebars.registerHelper("experiencedclass", (itemId, actorId, tokenId) => {
    const actor = getActorFromIds(actorId, tokenId);
    const item = actor && actor.items.get(itemId);
    // @ts-ignore hasExperience
    return item && item.data.data.hasExperience ? "experienced" : "";
  });

  Handlebars.registerHelper("quantity", (itemId, actorId, tokenId) => {
    const actor = getActorFromIds(actorId, tokenId);
    const item = actor && actor.items.get(itemId);
    if (!item) {
      return "---";
    }
    if (!hasOwnProperty(item.data.data, "quantity")) {
      const msg = `Handlebar helper quantity was called with an item without quantity propery`;
      ui.notifications?.error(msg);
      throw new RqgError(msg, item);
    }
    return item.data.data.quantity;
  });
  Handlebars.registerHelper("runeImg", (runeName: string): string | undefined => {
    if (!runeName) {
      return;
    }
    const availableRunes = getAvailableRunes();
    const rune = availableRunes.find((r) => r.name === runeName);
    if (!rune) {
      const msg = localize("RQG.Item.Notification.CantFindRuneInAvailableRunesError", {
        runeName: runeName,
      });
      ui.notifications?.error(msg);
      console.error("RQG |", msg);
      return "";
    }
    return rune.img;
  });

  Handlebars.registerHelper("defaultItemIconSrc", (itemType: string): string | undefined => {
    const defaultItemIconSettings: any = getGame().settings.get(
      systemId,
      "defaultItemIconSettings"
    );
    return defaultItemIconSettings[itemType];
  });

  Handlebars.registerHelper("enrichHtml", (content: string): string => {
    return TextEditor.enrichHTML(content);
  });

  Handlebars.registerHelper("equippedIcon", (equippedStatus: EquippedStatus): string => {
    equippedStatus = equippedStatus ? equippedStatus : "notCarried";
    return CONFIG.RQG.equippedIcons[equippedStatus];
  });

  Handlebars.registerHelper("gearViewIcon", (view: string): string => {
    return CONFIG.RQG.gearViewIcons[view as keyof typeof CONFIG.RQG.gearViewIcons];
  });

  Handlebars.registerHelper("yes-no", (bool: boolean): string => {
    return bool ? localize("RQG.Dialog.Common.yes") : localize("RQG.Dialog.Common.no");
  });

  Handlebars.registerHelper("multiply", (...nums) => {
    nums.pop();
    return Math.floor(nums.reduce((acc, n) => acc * n));
  });

  Handlebars.registerHelper("multiplyfixed2", (...nums) => {
    nums.pop();
    return nums.reduce((acc, n) => acc * n).toFixed(2);
  });

  Handlebars.registerHelper("sum", (...nums) => {
    nums.pop();
    return nums.reduce((acc, n) => acc + (n ?? 0), 0);
  });

  Handlebars.registerHelper("toLowerCase", function (value) {
    if (value) {
      return new Handlebars.SafeString(value.toLowerCase());
    } else {
      return "";
    }
  });

  Handlebars.registerHelper("rqidLinkImage", function (rqidLink: RqidLink) {
    if (rqidLink.documentType === "JournalEntry") {
      return `<i class="fas fa-book-open"></i>`;
    }

    if (rqidLink.documentType === "Item" && rqidLink.itemType) {
      const iconSettings: any = getGame().settings.get(systemId, "defaultItemIconSettings");
      // TODO use the first part of the rqid instead
      if (iconSettings[rqidLink.itemType]) {
        return `<img src="${iconSettings[rqidLink.itemType]}">`;
      }
    }

    return `<i class="fas fa-suitcase"></i>`;
  });
};
