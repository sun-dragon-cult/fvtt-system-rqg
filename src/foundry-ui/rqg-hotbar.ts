import { isDocumentSubType, localize } from "../system/util";
import { ItemTypeEnum } from "@item-model/item-types.ts";
import type { WeaponItem } from "@item-model/weapon-data-model.ts";
import { weaponUsageTypes } from "../data-model/shared/weapon-usage-choices";
import { hasLinkedSkillReference } from "../items/weapon-item/weapon-skill-links";

import Hotbar = foundry.applications.ui.Hotbar;
import Document = foundry.abstract.Document;

/**
 * The kind of macros that can be created by dropping a document onto the Hotbar.
 */
type MacroAction =
  "abilityRoll" | "attack" | "spiritMagicRoll" | "runeMagicRoll" | "rollTable" | "toggleSheet";

export class RqgHotbar extends Hotbar {
  static init() {
    CONFIG.ui.hotbar = RqgHotbar;
  }

  /**
   * Define the macros corresponding to each MacroAction type.
   */
  static macroActions = new Map<MacroAction, (doc: Document.Any) => string>([
    ["abilityRoll", (doc) => `const item = await fromUuid("${doc.uuid}"); item.abilityRoll();`],
    ["attack", (doc) => `const item = await fromUuid("${doc.uuid}"); item.attack();`],
    [
      "spiritMagicRoll",
      (doc) => `const item = await fromUuid("${doc.uuid}"); item.spiritMagicRoll();`,
    ],
    ["runeMagicRoll", (doc) => `const item = await fromUuid("${doc.uuid}"); item.runeMagicRoll();`],
    ["rollTable", (doc) => `(await fromUuid("${doc.uuid}")).draw()`],
    ["toggleSheet", (doc) => `Hotbar.toggleDocumentSheet("${doc.uuid}")`],
  ]);

  /**
   * Item types that have a dedicated action to perform (roll, cast, attack) instead of just
   * toggling the item sheet when dropped onto the Hotbar.
   */
  static itemActions = new Map<Item.SubType, MacroAction>([
    [ItemTypeEnum.Weapon, "attack"],
    [ItemTypeEnum.SpiritMagic, "spiritMagicRoll"],
    [ItemTypeEnum.RuneMagic, "runeMagicRoll"],
    [ItemTypeEnum.Passion, "abilityRoll"],
    [ItemTypeEnum.Rune, "abilityRoll"],
    [ItemTypeEnum.Skill, "abilityRoll"],
  ]);

  /**
   * Create a Macro document that with a macroAction depending on what document is dropped.
   * Returns undefined (adding nothing to the Hotbar) for weapons with no attackable usage type,
   * e.g. plain ammunition like arrows - a javelin still gets a macro since it can be thrown itself.
   */
  override async _createDocumentSheetToggle(doc: Document.Any): Promise<Macro.Implementation> {
    const item = doc.documentName === "Item" ? (doc as Item) : undefined;
    if (isDocumentSubType<WeaponItem>(item, ItemTypeEnum.Weapon)) {
      const isAttackable = weaponUsageTypes.some((usageType) =>
        hasLinkedSkillReference(item, usageType),
      );
      if (!isAttackable) {
        ui.notifications?.warn(
          localize("RQG.Hotbar.Warning.NotAddableToMacroBar", { name: doc.name ?? "" }),
        );
        // @ts-expect-error Returning undefined intentionally skips adding a macro to the Hotbar,
        // which is what the Foundry core caller already does when this returns a falsy value.
        return undefined;
      }
    }

    const { command, name } = this.getMacroCommandAndName(doc);

    // @ts-expect-error create
    return Macro.implementation.create({
      name: name,
      type: CONST.MACRO_TYPES.SCRIPT,
      img: this.getMacroImg(doc),
      command: command,
    });
  }

  getMacroImg(doc: Document.Any): string | undefined {
    return (doc as any).img || "icons/svg/book.svg";
  }

  getMacroCommandAndName(doc: Document.Any): { command: string | undefined; name: string } {
    const actorName = (doc.parent as Actor | null)?.prototypeToken?.name;

    // Items with a dedicated action (roll, cast spell, attack) instead of the item sheet
    if (doc.documentName === "Item") {
      const macroAction = RqgHotbar.itemActions.get((doc as Item).type);
      if (macroAction) {
        const translationKey = actorName
          ? "RQG.Hotbar.MacroName.ToChatEmbedded"
          : "RQG.Hotbar.MacroName.ToChat";
        const name = localize(translationKey, { name: doc.name ?? "", actor: actorName ?? "" });
        return { command: RqgHotbar.macroActions.get(macroAction)?.(doc), name: name };
      }
    }

    // Roll table (draw a result and send to chat)
    if (doc.documentName === "RollTable") {
      return {
        command: RqgHotbar.macroActions.get("rollTable")?.(doc),
        name: localize("RQG.Hotbar.MacroName.RollTable", { name: doc.name ?? "" }),
      };
    }

    // Default - toggle the display of the document sheet
    const translationKey = actorName
      ? "RQG.Hotbar.MacroName.ToggleSheetEmbedded"
      : "RQG.Hotbar.MacroName.ToggleSheet";
    const name = localize(translationKey, { name: doc.name ?? "", actor: actorName ?? "" });
    return { command: RqgHotbar.macroActions.get("toggleSheet")?.(doc), name: name };
  }
}
