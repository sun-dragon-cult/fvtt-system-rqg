import { ItemTypeEnum } from "@item-model/itemTypes.ts";
import {
  type HitLocationHealthState,
  hitLocationHealthStatusOptions,
  type HitLocationItem,
  HitLocationTypesEnum,
} from "@item-model/hitLocationDataModel.ts";
import { RqgActor } from "@actors/rqgActor.ts";
import {
  assertDocumentSubType,
  getSelectHitLocationOptions,
  localize,
  requireValue,
} from "../../system/util";
import { RqgItemSheetV2, type RqgItemSheetContext } from "../RqgItemSheetV2";
import { HealingCalculations } from "../../system/healingCalculations";
import { RqgItem } from "../rqgItem";
import { systemId } from "../../system/config";
import { templatePaths } from "../../system/loadHandlebarsTemplates";
import { damageType } from "@item-model/weaponDataModel.ts";
import { ActorTypeEnum, type CharacterActor } from "../../data-model/actor-data/rqgActorData.ts";

interface HitLocationSheetContext extends RqgItemSheetContext {
  allHitLocationOptions: SelectOptionData<string>[];
  hitLocationTypeOptions: SelectOptionData<HitLocationTypesEnum>[];
  hitLocationHealthStatusOptions: SelectOptionData<HitLocationHealthState>[];
  rqid: string;
}

export class HitLocationSheetV2 extends RqgItemSheetV2 {
  override get document(): HitLocationItem {
    return super.document as HitLocationItem;
  }

  static override DEFAULT_OPTIONS = {
    classes: [systemId, "item-sheet", "sheet", "hitLocation"],
    position: { width: 600, height: 410 },
    window: { resizable: true },
    form: { handler: HitLocationSheetV2.onSubmit, submitOnChange: true, closeOnSubmit: false },
  };

  static override PARTS = {
    header: { template: templatePaths.itemHitLocationSheetV2Header },
    tabs: { template: "templates/generic/tab-navigation.hbs" },
    "hit-location": { template: templatePaths.itemHitLocationSheetV2HitLocation, scrollable: [""] },
    definition: { template: templatePaths.itemHitLocationSheetV2Definition, scrollable: [""] },
  };

  static override TABS = {
    sheet: {
      tabs: [
        { id: "hit-location", label: "RQG.Item.SheetTab.HitLocation" },
        { id: "definition", label: "RQG.Item.SheetTab.HitLocationDefinition" },
      ],
      initial: "hit-location",
      labelPrefix: null,
    },
  };

  override async _prepareContext(): Promise<HitLocationSheetContext> {
    const base = await super._prepareContext();
    const system = base.system as any;

    // Use the actor-derived values so passive effects show correctly
    system.hitPoints = this.document.system.hitPoints;
    system.armorPoints = this.document.system.armorPoints;

    const context: HitLocationSheetContext = {
      ...base,
      rqid: this.document.flags?.[systemId]?.documentRqidFlags?.id ?? "",
      allHitLocationOptions: getSelectHitLocationOptions(),
      hitLocationHealthStatusOptions: hitLocationHealthStatusOptions,
      hitLocationTypeOptions: Object.values(HitLocationTypesEnum).map((type) => ({
        value: type,
        label: "RQG.Item.HitLocationType." + type,
      })),
    };

    if (!context.isEmbedded && this.tabGroups?.["sheet"] === "hit-location") {
      this.tabGroups["sheet"] = "definition";
    }
    if (!context.isGM && this.tabGroups?.["sheet"] === "definition") {
      this.tabGroups["sheet"] = "hit-location";
    }

    (context as any).tabs = this._prepareTabs("sheet");

    if (!context.isEmbedded) {
      delete (context as any).tabs["hit-location"];
    }
    if (!context.isGM) {
      delete (context as any).tabs.definition;
    }

    return context;
  }

  /** Static helpers preserved verbatim from the AppV1 sheet */
  static async showAddWoundDialog(actor: RqgActor, hitLocationItemId: string): Promise<void> {
    const hitLocation = actor.items.get(hitLocationItemId) as RqgItem | undefined;
    assertDocumentSubType<HitLocationItem>(
      hitLocation,
      ItemTypeEnum.HitLocation,
      "RQG.Item.HitLocation.Notification.CantFindHitLocation",
    );

    const dialogContentHtml = await foundry.applications.handlebars.renderTemplate(
      templatePaths.hitLocationAddWound,
      {},
    );
    new Dialog(
      {
        title: localize("RQG.Item.HitLocation.AddWound.Title", {
          hitLocationName: hitLocation.name,
        }),
        content: dialogContentHtml,
        default: "submit",
        render: () => {
          $("#inflictDamagePoints").focus();
        },
        buttons: {
          submit: {
            icon: '<i class="fas fa-check"></i>',
            label: localize("RQG.Item.HitLocation.AddWound.btnAddWound"),
            callback: async (html: JQuery | HTMLElement) =>
              await HitLocationSheetV2.submitAddWoundDialog(html as JQuery, actor, hitLocation),
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: localize("RQG.Dialog.Common.btnCancel"),
            callback: () => null,
          },
        },
      },
      { classes: [systemId, "dialog"] },
    ).render(true);
  }

  private static async submitAddWoundDialog(
    html: JQuery,
    actor: RqgActor,
    hitLocation: RqgItem,
  ): Promise<void> {
    assertDocumentSubType<HitLocationItem>(hitLocation, ItemTypeEnum.HitLocation);
    const formData = new FormData(html.find("form")[0]);
    const data = Object.fromEntries(formData.entries());
    const applyDamageToTotalHp: boolean = !!data["toTotalHp"];
    const ignoreAP: boolean = !data["subtractAP"];
    const damage = Number(data["damage"]);

    actor.applyDamage(
      damage,
      hitLocation.system.dieFrom,
      ignoreAP,
      applyDamageToTotalHp,
      damageType.Impale,
    );
  }

  static async showHealWoundDialog(actor: RqgActor, hitLocationItemId: string): Promise<void> {
    assertDocumentSubType<CharacterActor>(actor, ActorTypeEnum.Character);
    const hitLocation = actor.items.get(hitLocationItemId) as RqgItem | undefined;
    assertDocumentSubType<HitLocationItem>(hitLocation, ItemTypeEnum.HitLocation);

    const dialogContentHtml = await foundry.applications.handlebars.renderTemplate(
      templatePaths.hitLocationHealWound,
      {
        hitLocationName: hitLocation.name,
        wounds: hitLocation.system.wounds,
      },
    );

    new Dialog(
      {
        title: localize("RQG.Item.HitLocation.HealWound.Title", {
          hitLocationName: hitLocation.name,
        }),
        content: dialogContentHtml,
        default: "submit",
        render: () => {
          $("#healWoundPoints").focus();
        },
        buttons: {
          submit: {
            icon: '<i class="fas fa-check"></i>',
            label: localize("RQG.Item.HitLocation.HealWound.btnHealWound"),
            callback: async (html: JQuery | HTMLElement) =>
              await HitLocationSheetV2.submitHealWoundDialog(html as JQuery, actor, hitLocation),
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: localize("RQG.Dialog.Common.btnCancel"),
            callback: () => null,
          },
        },
      },
      { classes: [systemId, "dialog", "heal-wound"] },
    ).render(true);
  }

  private static async submitHealWoundDialog(
    html: JQuery,
    actor: RqgActor,
    hitLocation: RqgItem,
  ): Promise<void> {
    assertDocumentSubType<HitLocationItem>(hitLocation, ItemTypeEnum.HitLocation);
    const formData = new FormData(html.find("form")[0]);
    const data = Object.fromEntries(formData.entries());
    requireValue(
      hitLocation.system.hitPoints.value,
      localize("RQG.Item.HitLocation.Notification.NoValueOnHitLocation", {
        hitLocationName: hitLocation.name,
      }),
    );
    requireValue(
      hitLocation.system.hitPoints.max,
      localize("RQG.Item.HitLocation.Notification.NoMaxOnHitLocation", {
        hitLocationName: hitLocation.name,
      }),
    );
    const healWoundIndex: number = Number(data["wound"]);
    const healPoints: number = Number(data["heal"]);
    const { hitLocationUpdates, actorUpdates, usefulLegs } = HealingCalculations.healWound(
      healPoints,
      healWoundIndex,
      hitLocation,
      actor,
    );

    if (hitLocationUpdates) {
      await hitLocation.update(hitLocationUpdates as any);
    }
    if (actorUpdates) {
      await actor.update(actorUpdates as any);
    }

    if (actor.isToken) {
      await actor.updateTokenEffectFromHealth();
    } else {
      const activeTokens = actor.getActiveTokens(true, false);
      const currentScene = game.scenes?.current;
      if (currentScene && activeTokens.length) {
        const token = currentScene.getEmbeddedDocument("Token", activeTokens[0]?.id ?? "", {});
        if (token) {
          await actor.updateTokenEffectFromHealth();
        }
      }
    }

    for (const update of usefulLegs) {
      if (update != null && update._id != null) {
        const item = actor.items.get(update._id);
        if (item) {
          await item.update(update as any);
        }
      }
    }

    if (hitLocation.system.wounds.length) {
      await this.showHealWoundDialog(actor, hitLocation.id!);
    }
  }

  override async _onRender(context: any, options: any): Promise<void> {
    await super._onRender(context, options);

    // Add event listener for healing wounds
    const healWoundElement = this.element?.querySelector<HTMLElement>("[data-item-heal-wound]");
    if (healWoundElement && this.document.isEmbedded && this.document.actor) {
      healWoundElement.addEventListener("click", () => {
        HitLocationSheetV2.showHealWoundDialog(this.document.actor as RqgActor, this.document.id!);
      });
    }
  }

  protected static override async onSubmit(
    _event: SubmitEvent | Event,
    _form: HTMLFormElement,
    formData: foundry.applications.ux.FormDataExtended,
  ): Promise<void> {
    const sheet = this as unknown as HitLocationSheetV2;
    await sheet.document.update(formData.object);
  }
}
