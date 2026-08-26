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
  | "abilityRoll"
  | "attack"
  | "spiritMagicRoll"
  | "runeMagicRoll"
  | "rollTable"
  | "toggleSheet"
  | "openJournalPage";

export class RqgHotbar extends Hotbar {
  static init() {
    CONFIG.ui.hotbar = RqgHotbar;
    Hooks.on("hotbarDrop", RqgHotbar.onHotbarDrop);
  }

  /**
   * Foundry doesn't resolve a dropped Compendium pack to a Document - there's no "Compendium"
   * document type - so the core Hotbar silently does nothing when one is dropped. Create a macro
   * that opens the compendium here instead, and cancel the (otherwise no-op) default handling.
   *
   * Must return synchronously: Hooks.call checks `=== false` on the direct return value, so an
   * async function (which always returns a Promise) could never cancel the default handling.
   */
  static onHotbarDrop(
    _hotbar: foundry.applications.ui.Hotbar.Any,
    data: Macro.DropData,
    slot: number,
  ): boolean | void {
    const dropData = data as unknown as { type?: string; collection?: string };
    if (dropData.type !== "Compendium" || !dropData.collection) {
      return;
    }

    void RqgHotbar.createCompendiumOpenMacro(dropData.collection, slot);
    return false;
  }

  private static async createCompendiumOpenMacro(collection: string, slot: number): Promise<void> {
    const pack = game.packs?.get(collection);
    if (!pack) {
      return;
    }

    const macro = await Macro.implementation.create({
      name: localize("RQG.Hotbar.MacroName.OpenCompendium", { name: pack.title }),
      type: CONST.MACRO_TYPES.SCRIPT,
      img: "icons/svg/book.svg",
      command: `game.packs.get("${collection}")?.render(true);`,
    });
    if (macro) {
      await game.user?.assignHotbarMacro(macro, slot);
    }
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
    [
      "openJournalPage",
      (doc) =>
        `const page = await fromUuid("${doc.uuid}"); page.parent.sheet.render(true, { pageId: page.id });`,
    ],
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
   * Returns undefined (adding nothing to the Hotbar) for documents with no reasonable hotbar
   * action: a Folder (dropping one just toggled a not-very-useful sheet), and a weapon with no
   * attackable usage type, e.g. plain ammunition like arrows - a javelin still gets a macro
   * since it can be thrown itself.
   */
  override async _createDocumentSheetToggle(doc: Document.Any): Promise<Macro.Implementation> {
    if (doc.documentName === "Folder") {
      return this.notAddableToMacroBar(doc);
    }

    const item = doc.documentName === "Item" ? (doc as Item) : undefined;
    if (isDocumentSubType<WeaponItem>(item, ItemTypeEnum.Weapon)) {
      const isAttackable = weaponUsageTypes.some((usageType) =>
        hasLinkedSkillReference(item, usageType),
      );
      if (!isAttackable) {
        return this.notAddableToMacroBar(doc);
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

  /**
   * Warn instead of creating a Macro for a document that has no reasonable standalone hotbar
   * action. Returning undefined skips adding anything to the Hotbar, which is what the Foundry
   * core caller already does when this returns a falsy value.
   */
  notAddableToMacroBar(doc: Document.Any): Macro.Implementation {
    ui.notifications?.warn(
      localize("RQG.Hotbar.Warning.NotAddableToMacroBar", { name: doc.name ?? "" }),
    );
    // @ts-expect-error Intentionally undefined - see the method doc comment above.
    return undefined;
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

    // Journal Entry Page - open the parent Journal Entry sheet with this page selected,
    // instead of the page's own standalone editor.
    if (doc.documentName === "JournalEntryPage") {
      return {
        command: RqgHotbar.macroActions.get("openJournalPage")?.(doc),
        name: localize("RQG.Hotbar.MacroName.OpenJournalPage", { name: doc.name ?? "" }),
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
