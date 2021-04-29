import { EquippedStatus } from "../data-model/item-data/IPhysicalItem";
import { getActorFromIds, RqgError } from "./util";
import { RqgConfig } from "./config";

declare const CONFIG: RqgConfig;

export const handlebarsHelpers = function () {
  Handlebars.registerHelper("concat", (...strs) =>
    strs.filter((s) => typeof s !== "object").join("")
  );
  Handlebars.registerHelper("json", (context) => JSON.stringify(context));

  Handlebars.registerHelper("currency", (value, unit) => {
    return `${new Intl.NumberFormat().format(value)} ${unit}`;
  });

  Handlebars.registerHelper("itemname", (itemId, actorId, tokenId) => {
    const actor = getActorFromIds(actorId, tokenId);
    const item = actor.items.get(itemId);
    return item ? item.data.name : "---";
  });

  Handlebars.registerHelper("skillchance", (itemId, actorId, tokenId) => {
    const actor = getActorFromIds(actorId, tokenId);
    const item = actor.items.get(itemId);
    // @ts-ignore chance
    return item ? item.data.data.chance : "---";
  });

  Handlebars.registerHelper("experiencedclass", (itemId, actorId, tokenId) => {
    const actor = getActorFromIds(actorId, tokenId);
    const item = actor.items.get(itemId);
    // @ts-ignore hasExperience
    return item && item.data.data.hasExperience ? "experienced" : "";
  });

  Handlebars.registerHelper("quantity", (itemId, actorId) => {
    const actor = game.actors?.find((a) => a._id === actorId);
    if (!actor) {
      console.warn(
        `RQG | Handlebar helper "quantity": Couldn't find actor "${actorId}" while checking quantity on item "${itemId}" `
      );
    }
    const item = actor?.items.get(itemId);
    return item ? item.data.data.quantity : "---";
  });

  Handlebars.registerHelper("runeImg", (runeName: string): string | undefined => {
    if (!runeName) {
      return;
    }
    const allRunesIndex = game.settings.get("rqg", "runes") as Compendium.IndexEntry[];
    const rune = allRunesIndex.find((r) => r.name === runeName);
    if (!rune) {
      const msg = `Couldn't find rune ${runeName}`;
      ui.notifications?.error(msg);
      throw new RqgError(msg);
    }
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
