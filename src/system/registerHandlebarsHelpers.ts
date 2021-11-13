import { EquippedStatus } from "../data-model/item-data/IPhysicalItem";
import { getActorFromIds, getAllRunesIndex, hasOwnProperty, RqgError } from "./util";
import { ItemTypeEnum } from "../data-model/item-data/itemTypes";

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
    const allRunesIndex = getAllRunesIndex();
    // @ts-ignore waiting for issue #897 in foundry-vtt-types (r.name)
    const rune = allRunesIndex.find((r) => r.name === runeName);
    if (!rune) {
      const msg = `Couldn't find rune ${runeName}`;
      ui.notifications?.error(msg);
      throw new RqgError(msg);
    }
    // @ts-ignore waiting for issue #897 in foundry-vtt-types
    return rune.img;
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
    return bool ? "yes" : "no";
  });

  Handlebars.registerHelper("multiply", (...nums) => {
    nums.pop();
    return Math.floor(
      nums.reduce((acc, n) => {
        acc = acc * n;
        return acc;
      })
    );
  });

  Handlebars.registerHelper("sum", (...nums) => {
    nums.pop();
    return nums.reduce((acc, n) => {
      acc = acc + n;
      return acc;
    });
  });
};
