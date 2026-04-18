import { ItemTypeEnum } from "@item-model/itemTypes.ts";
import { SkillCategoryEnum, type SkillItem } from "@item-model/skillData.ts";
import { RqgItem } from "../rqgItem";
import { type EquippedStatus, equippedStatusOptions } from "@item-model/IPhysicalItem.ts";
import { RqgItemSheetV2, type RqgItemSheetContext } from "../RqgItemSheetV2";
import { getDomDataset, isDocumentSubType, localize } from "../../system/util";
import { type DamageType, damageTypeOptions, type WeaponItem } from "@item-model/weaponData.ts";
import { systemId } from "../../system/config";
import { getAllowedDropDocumentTypes, isAllowedDocumentType } from "../../documents/dragDrop";
import { documentRqidFlags } from "../../data-model/shared/rqgDocumentFlags";
import { RqidLink } from "../../data-model/shared/rqidLink";
import { templatePaths } from "../../system/loadHandlebarsTemplates";

interface WeaponSheetContext extends RqgItemSheetContext {
  defaultCombatManeuverNames: Record<string, string>;
  damageTypeOptions: SelectOptionData<DamageType>[];
  equippedStatusOptions: SelectOptionData<EquippedStatus>[];
  rateOfFireOptions: SelectOptionData<number>[];
  ownedProjectileOptions: SelectOptionData<string>[];
  enrichedDescription: string;
  enrichedGmNotes: string;
}

export class WeaponSheetV2 extends RqgItemSheetV2 {
  override get document(): WeaponItem {
    return super.document as WeaponItem;
  }

  static override DEFAULT_OPTIONS = {
    classes: [systemId, "item-sheet", "sheet", "weapon"],
    position: { width: 960, height: 800 },
    form: { handler: WeaponSheetV2.onSubmit, submitOnChange: true, closeOnSubmit: false },
    window: { resizable: true },
  };

  static override PARTS: Record<string, any> = {
    header: { template: templatePaths.itemWeaponSheetV2Header },
    tabs: { template: "templates/generic/tab-navigation.hbs" },
    weapon: { template: templatePaths.itemWeaponSheetV2Weapon, scrollable: [""] },
    usage: { template: templatePaths.itemWeaponSheetV2Usage, scrollable: [""] },
    description: { template: templatePaths.itemWeaponSheetV2Description, scrollable: [""] },
    gm: { template: templatePaths.itemWeaponSheetV2Gm, scrollable: [""] },
    effects: { template: templatePaths.itemWeaponSheetV2Effects, scrollable: [""] },
  };

  static override TABS: Record<string, any> = {
    sheet: {
      tabs: [
        { id: "weapon", label: "RQG.Item.SheetTab.Weapon" },
        { id: "usage", label: "RQG.Item.SheetTab.WeaponUsage" },
        { id: "description", label: "RQG.Item.SheetTab.Description" },
        { id: "gm", label: "RQG.Item.SheetTab.GMNotes" },
        { id: "effects", label: "RQG.Item.SheetTab.ActiveEffects" },
      ],
      initial: "weapon",
      labelPrefix: null,
    },
  };

  override async _prepareContext(): Promise<WeaponSheetContext> {
    const base = await super._prepareContext();
    const system = base.system as any;

    if (isNaN(Number(system.quantity))) {
      system.quantity = 1;
    }

    const context: WeaponSheetContext = {
      ...base,
      enrichedDescription: await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        system.description,
      ),
      enrichedGmNotes: await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        system.gmNotes,
      ),
      defaultCombatManeuverNames: Array.from(CONFIG.RQG.combatManeuvers.keys()).reduce(
        (acc: Record<string, string>, cm) => {
          acc[cm] = localize(`RQG.Item.Weapon.combatManeuver.${cm}`);
          return acc;
        },
        {},
      ),
      damageTypeOptions: damageTypeOptions,
      equippedStatusOptions: equippedStatusOptions,
      ownedProjectileOptions: this.getOwnedProjectileOptions(),
      rateOfFireOptions: [
        { value: 0, label: localize("RQG.Game.SrMeleeRoundAbbr") },
        { value: 1, label: `1/${localize("RQG.Game.MeleeRoundAbbr")}` },
        { value: 2, label: `1/2${localize("RQG.Game.MeleeRoundAbbr")}` },
        { value: 3, label: `1/3${localize("RQG.Game.MeleeRoundAbbr")}` },
        { value: 4, label: `1/4${localize("RQG.Game.MeleeRoundAbbr")}` },
        { value: 5, label: `1/5${localize("RQG.Game.MeleeRoundAbbr")}` },
      ],
    };

    if (!context.isGM && ["gm", "effects"].includes(this.tabGroups?.["sheet"] ?? "")) {
      this.tabGroups["sheet"] = WeaponSheetV2.TABS["sheet"].initial;
    }

    (context as any).tabs = this._prepareTabs("sheet");

    if (!context.isGM) {
      delete (context as any).tabs.gm;
      delete (context as any).tabs.effects;
    }

    return context;
  }

  private getOwnedProjectileOptions(): SelectOptionData<string>[] {
    if (this.document.isOwned) {
      return [
        { value: "", label: "---" },
        ...this.document
          .actor!.getEmbeddedCollection("Item")
          .filter(
            (i) => isDocumentSubType<WeaponItem>(i, ItemTypeEnum.Weapon) && i.system.isProjectile,
          )
          .map((i) => ({ value: i.id ?? "", label: i.name ?? "" })),
      ];
    }
    return [];
  }

  protected override async _onDropDocument(
    event: DragEvent,
    data: { type: string; uuid: string },
  ): Promise<boolean | RqgItem[]> {
    if (data.type !== "Item") {
      return super._onDropDocument(event, data);
    }
    const allowedDropDocumentTypes = getAllowedDropDocumentTypes(event);
    const droppedItem = (await Item.implementation.fromDropData(data)) as SkillItem;
    const usage = getDomDataset(event, "dropzone");

    if (!isAllowedDocumentType(droppedItem, allowedDropDocumentTypes)) {
      return false;
    }
    if (
      !(
        [
          SkillCategoryEnum.MeleeWeapons,
          SkillCategoryEnum.MissileWeapons,
          SkillCategoryEnum.NaturalWeapons,
          SkillCategoryEnum.Shields,
        ] as SkillCategoryEnum[]
      ).includes(droppedItem?.system?.category as SkillCategoryEnum)
    ) {
      const msg = localize("RQG.Item.Weapon.WrongTypeDropped");
      ui.notifications?.warn(msg, { console: false });
      console.warn(`RQG | ${msg}`);
      return false;
    }
    const droppedItemRqid = droppedItem?.getFlag(systemId, documentRqidFlags)?.id;
    if (!droppedItemRqid) {
      const msg = localize("RQG.Item.Weapon.DropSkillMissingRqid");
      ui.notifications?.warn(msg, { console: false });
      console.warn(`RQG | ${msg}`);
      return false;
    }

    if (!usage || !["oneHand", "twoHand", "offHand", "missile"].includes(usage)) {
      const msg = localize("RQG.Item.Weapon.WrongDropzone");
      ui.notifications?.warn(msg, { console: false });
      console.error(`RQG | ${msg}`);
      return false;
    }
    const actorItemWithSameRqid =
      this.document.actor?.getBestEmbeddedDocumentByRqid(droppedItemRqid);
    if (!actorItemWithSameRqid) {
      await this.document.actor?.createEmbeddedDocuments("Item", [droppedItem]);
    }
    await this.document.update({
      [`system.usage.${usage}.skillRqidLink`]: new RqidLink(droppedItemRqid, droppedItem.name),
    });
    return [this.document];
  }

  protected static override async onSubmit(
    event: SubmitEvent | Event,
    _form: HTMLFormElement,
    formData: foundry.applications.ux.FormDataExtended,
  ): Promise<void> {
    const sheet = this as unknown as WeaponSheetV2;
    const data = formData.object as Record<string, unknown>;

    data["system.usage.oneHand.combatManeuvers"] = WeaponSheetV2.getUsageCombatManeuvers(
      "oneHand",
      data,
    );
    data["system.usage.offHand.combatManeuvers"] = WeaponSheetV2.getUsageCombatManeuvers(
      "offHand",
      data,
    );
    data["system.usage.twoHand.combatManeuvers"] = WeaponSheetV2.getUsageCombatManeuvers(
      "twoHand",
      data,
    );
    data["system.usage.missile.combatManeuvers"] = WeaponSheetV2.getUsageCombatManeuvers(
      "missile",
      data,
    );

    WeaponSheetV2.copyOneHandData2offHand(data);

    // Weapon type mutual exclusion
    const triggeredName = (event.target as HTMLInputElement)?.name;
    if (triggeredName === "system.isThrownWeapon") {
      data["system.isProjectileWeapon"] = false;
      data["system.isRangedWeapon"] = false;
    } else if (triggeredName === "system.isProjectileWeapon") {
      data["system.isThrownWeapon"] = false;
      data["system.isRangedWeapon"] = false;
    } else if (triggeredName === "system.isRangedWeapon") {
      data["system.isThrownWeapon"] = false;
      data["system.isProjectileWeapon"] = false;
    }

    data["system.rate"] = Number(data["system.rate"]);

    data["system.physicalItemType"] =
      data["system.isProjectile"] || data["system.isThrownWeapon"] ? "consumable" : "unique";

    if (data["system.physicalItemType"] === "unique") {
      data["system.quantity"] = 1;
    }

    if (!data["system.isProjectileWeapon"] && !data["system.isThrownWeapon"]) {
      data["system.projectileId"] = "";
    }

    if (data["system.isThrownWeapon"]) {
      data["system.projectileId"] = sheet.document.id;
    }

    if (data["system.hitPointLocation"]) {
      data["system.hitPoints.value"] = "";
      data["system.hitPoints.max"] = "";
    }

    await sheet.document.update(data);
  }

  private static copyOneHandData2offHand(data: Record<string, unknown>): void {
    data["system.usage.offHand.combatManeuvers"] = data["system.usage.oneHand.combatManeuvers"];
    data["system.usage.offHand.damage"] = data["system.usage.oneHand.damage"];
    data["system.usage.offHand.minStrength"] = data["system.usage.oneHand.minStrength"];
    data["system.usage.offHand.minDexterity"] = data["system.usage.oneHand.minDexterity"];
    data["system.usage.offHand.strikeRank"] = data["system.usage.oneHand.strikeRank"];
  }

  private static getCombatManeuverInfo(nameInput: unknown): { name: string; configKey?: string } {
    const name = `${nameInput ?? ""}`.trim();
    if (!name) {
      return { name: "" };
    }

    if (CONFIG.RQG.combatManeuvers.has(name)) {
      return {
        name: localize(`RQG.Item.Weapon.combatManeuver.${name}`),
        configKey: name,
      };
    }

    const keyFromLocalizedLabel = Array.from(CONFIG.RQG.combatManeuvers.keys()).find(
      (key) => localize(`RQG.Item.Weapon.combatManeuver.${key}`) === name,
    );

    return {
      name,
      configKey: keyFromLocalizedLabel,
    };
  }

  private static getUsageCombatManeuvers(usage: string, data: Record<string, unknown>): any[] {
    const usageNames = data[`system.usage.${usage}.combatManeuvers.name`];
    const usageCombatManeuversNames = Array.isArray(usageNames) ? usageNames : [usageNames];

    return foundry.utils.duplicate(
      usageCombatManeuversNames.reduce((acc: any[], storedNameOrKey: any, i: number) => {
        const { name, configKey } = WeaponSheetV2.getCombatManeuverInfo(storedNameOrKey);
        if (name) {
          const configManeuver = configKey ? CONFIG.RQG.combatManeuvers.get(configKey) : undefined;
          const dmgType =
            data[`system.usage.${usage}.combatManeuvers.damageTypes`] ??
            configManeuver?.defaultDamageType;

          const damageTypes = Array.isArray(dmgType) ? dmgType : [dmgType];
          const defaultDamageTypeDescription = configManeuver?.specialDescriptionHtml;
          const damageType =
            damageTypes.length > i ? damageTypes[i] : configManeuver?.defaultDamageType;

          const desc = data[`system.usage.${usage}.combatManeuvers.description`];
          const descriptions = Array.isArray(desc) ? desc : [desc];
          const description = descriptions.length > i ? descriptions[i] : "";
          acc.push({
            name,
            damageType,
            description,
            placeholder:
              defaultDamageTypeDescription ??
              "Enter description of how this attack works, or get normal damage buttons (no special handling of critical success damage etc.)",
          });
        }
        return acc;
      }, []),
    );
  }
}
