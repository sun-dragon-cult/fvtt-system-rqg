import { ItemTypeEnum } from "@item-model/item-types.ts";
import type { SkillItem } from "@item-model/skill-data-model.ts";
import { SkillCategoryEnum } from "@item-model/skill-enums.ts";
import { type EquippedStatus, equippedStatusOptions } from "@item-model/i-physical-item.ts";
import {
  RqgItemSheetV2,
  type AppV2RenderContext,
  type AppV2RenderOptions,
  type RqgItemSheetContext,
} from "../rqg-item-sheet-v2";
import type { RqgLinkDropDetail } from "../../applications/rqg-link/rqg-link-field-element";
import type { RqidString } from "../../system/api/rqid-api";
import { isDocumentSubType, localize } from "../../system/util";
import {
  combatManeuverKey,
  damageTypeOptions,
  type WeaponItem,
} from "@item-model/weapon-data-model.ts";
import type { DamageType } from "@item-model/weapon-enums.ts";
import { systemId } from "../../system/config";
import { templatePaths } from "../../system/load-handlebars-templates";
import { toEmbeddedSkillCreateData } from "./weapon-skill-links";
import { RqgLogger } from "../../system/logging/rqg-logger";
import type { RqgActor } from "@actors/rqg-actor.ts";

const logger = new RqgLogger("WeaponSheetV2");

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

  static override PARTS = {
    header: { template: templatePaths.itemWeaponSheetV2Header },
    tabs: { template: "templates/generic/tab-navigation.hbs" },
    weapon: { template: templatePaths.itemWeaponSheetV2Weapon, scrollable: [""] },
    usage: { template: templatePaths.itemWeaponSheetV2Usage, scrollable: [""] },
    description: { template: templatePaths.itemWeaponSheetV2Description, scrollable: [""] },
    gm: { template: templatePaths.itemWeaponSheetV2Gm, scrollable: [""] },
    effects: { template: templatePaths.itemWeaponSheetV2Effects, scrollable: [""] },
  };

  static override TABS = {
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

    context.tabs = this._prepareTabs("sheet");

    if (!context.isGM) {
      delete context.tabs["gm"];
      delete context.tabs["effects"];
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

  override async _onRender(
    context: AppV2RenderContext,
    options: AppV2RenderOptions,
  ): Promise<void> {
    await super._onRender(context, options);
    if (options.isFirstRender) {
      this.element.addEventListener("rqg-link-drop", (event) => {
        if ((event.target as Element).matches('[name^="system.usage."]')) {
          this.onDropUsageSkill(event as CustomEvent<RqgLinkDropDetail>);
        }
      });
      // The whole usage fieldset takes a skill, as its link field does
      for (const type of ["dragover", "dragleave", "drop"] as const) {
        this.element.addEventListener(type, (event) => {
          const field = (event.target as Element)
            .closest("fieldset.usage")
            ?.querySelector("rqg-link-field");
          if (field && !field.contains(event.target as Node)) {
            event.preventDefault();
            event.stopPropagation();
            field.dispatchEvent(new DragEvent(type, event));
          }
        });
      }
    }
  }

  /** Only weapon skills may be linked; the owning actor gets the skill if it lacks it. */
  private onDropUsageSkill(event: CustomEvent<RqgLinkDropDetail>): void {
    const droppedItem = event.detail.document as SkillItem;
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
      event.preventDefault();
      logger.warn(localize("RQG.Item.Weapon.WrongTypeDropped"));
      return;
    }
    const actor = this.document.actor;
    if (actor && !actor.getBestEmbeddedDocumentByRqid(event.detail.ref as RqidString)) {
      void WeaponSheetV2.addSkillToActor(actor, droppedItem);
    }
  }

  private static async addSkillToActor(actor: RqgActor, skill: SkillItem): Promise<void> {
    try {
      await actor.createEmbeddedDocuments("Item", [toEmbeddedSkillCreateData(skill)]);
    } catch (error) {
      logger.error(
        localize("RQG.Item.Weapon.AddSkillToActorFailed", {
          skillName: skill.name ?? "",
          actorName: actor.name ?? "",
        }),
        undefined,
        error,
      );
    }
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

    if (data["system.rate"] == null || data["system.rate"] === "") {
      data["system.rate"] = sheet.document.system.rate ?? 0;
    } else {
      data["system.rate"] = Number(data["system.rate"]);
    }

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

  private static getUsageCombatManeuvers(usage: string, data: Record<string, unknown>): any[] {
    const usageNames = data[`system.usage.${usage}.combatManeuvers.name`];
    const usageCombatManeuversNames = Array.isArray(usageNames) ? usageNames : [usageNames];

    return foundry.utils.duplicate(
      usageCombatManeuversNames.reduce((acc: any[], typedName: any, i: number) => {
        const name = combatManeuverKey(`${typedName ?? ""}`);
        if (name) {
          const configManeuver = CONFIG.RQG.combatManeuvers.get(name);
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
