import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import {
  hitLocationHealthStatuses,
  HitLocationTypesEnum,
} from "../../data-model/item-data/hitLocationData";
import { RqgActor } from "../../actors/rqgActor";
import {
  assertItemType,
  AvailableItemCache,
  getAvailableHitLocations,
  getGame,
  getGameUser,
  localize,
  requireValue,
  RqgError,
} from "../../system/util";
import { RqgItemSheet } from "../RqgItemSheet";
import { HealingCalculations } from "../../system/healingCalculations";
import { RqgItem } from "../rqgItem";
import { systemId } from "../../system/config";
import { ItemSheetData } from "../shared/sheetInterfaces";
import { templatePaths } from "../../system/loadHandlebarsTemplates";

interface HitLocationSheetData {
  allHitLocations: AvailableItemCache[];
  hitLocationTypes: string[];
  hitLocationHealthStatuses: string[];
  rqid: string;
}

export class HitLocationSheet extends RqgItemSheet<
  ItemSheet.Options,
  HitLocationSheetData | ItemSheet.Data
> {
  static get defaultOptions(): ItemSheet.Options {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: [systemId, "item-sheet", "sheet", ItemTypeEnum.HitLocation],
      template: templatePaths.itemHitLocationSheet,
      width: 450,
      height: 500,
      tabs: [
        {
          navSelector: ".item-sheet-nav-tabs",
          contentSelector: ".sheet-body",
          initial: "hit-location",
        },
      ],
    });
  }

  getData(): HitLocationSheetData & ItemSheetData {
    // @ts-expect-error _source Read from the original data unaffected by any AEs
    const system = foundry.utils.duplicate(this.document._source.system);
    system.hitPoints = this.document.system.hitPoints; // Use the actor derived values
    system.armorPoints = this.document.system.armorPoints; // Use the actor derived value

    return {
      id: this.document.id ?? "",
      uuid: this.document.uuid,
      rqid: this.document.flags?.[systemId]?.documentRqidFlags?.id ?? "",
      name: this.document.name ?? "",
      img: this.document.img ?? "",
      isGM: getGameUser().isGM,
      isEmbedded: this.document.isEmbedded,
      system: system,

      allHitLocations: getAvailableHitLocations(),
      hitLocationTypes: Object.values(HitLocationTypesEnum),
      hitLocationHealthStatuses: Object.values(hitLocationHealthStatuses),
    };
  }

  static async showAddWoundDialog(actor: RqgActor, hitLocationItemId: string): Promise<void> {
    const hitLocation = actor.items.get(hitLocationItemId);
    if (!hitLocation || hitLocation.type !== ItemTypeEnum.HitLocation) {
      const msg = localize("RQG.Item.HitLocation.Notification.CantFindHitLocation", {
        hitLocationItemId: hitLocationItemId,
        actorName: actor.name,
      });
      ui.notifications?.error(msg);
      throw new RqgError(msg);
    }

    const dialogContentHtml = await renderTemplate(templatePaths.hitLocationAddWound, {});
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
              await HitLocationSheet.submitAddWoundDialog(html as JQuery, actor, hitLocation),
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: localize("RQG.Dialog.Common.btnCancel"),
            callback: () => null,
          },
        },
      },
      {
        classes: [systemId, "dialog"],
      },
    ).render(true);
  }

  private static async submitAddWoundDialog(html: JQuery, actor: RqgActor, hitLocation: RqgItem) {
    assertItemType(hitLocation.type, ItemTypeEnum.HitLocation);
    const formData = new FormData(html.find("form")[0]);
    const data = Object.fromEntries(formData.entries());
    const applyDamageToTotalHp: boolean = !!data.toTotalHp;
    const ignoreAP: boolean = !data.subtractAP;
    const damage = Number(data.damage);

    actor.applyDamage(damage, hitLocation.system.dieFrom, ignoreAP, applyDamageToTotalHp);
  }

  static async showHealWoundDialog(actor: RqgActor, hitLocationItemId: string) {
    const hitLocation = actor.items.get(hitLocationItemId);
    assertItemType(hitLocation?.type, ItemTypeEnum.HitLocation);

    const dialogContentHtml = await renderTemplate(templatePaths.hitLocationHealWound, {
      hitLocationName: hitLocation.name,
      wounds: hitLocation.system.wounds,
    });

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
              await HitLocationSheet.submitHealWoundDialog(html as JQuery, actor, hitLocation),
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: localize("RQG.Dialog.Common.btnCancel"),
            callback: () => null,
          },
        },
      },
      {
        classes: [systemId, "dialog", "heal-wound"],
      },
    ).render(true);
  }

  private static async submitHealWoundDialog(
    html: JQuery,
    actor: RqgActor,
    hitLocation: RqgItem,
  ): Promise<void> {
    assertItemType(hitLocation.type, ItemTypeEnum.HitLocation);
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
    const healWoundIndex: number = Number(data.wound);
    const healPoints: number = Number(data.heal);
    const { hitLocationUpdates, actorUpdates, usefulLegs } = HealingCalculations.healWound(
      healPoints,
      healWoundIndex,
      hitLocation,
      actor,
    );

    if (hitLocationUpdates) {
      await hitLocation.update(hitLocationUpdates);
    }
    if (actorUpdates) {
      await actor.update(actorUpdates);
    }

    if (actor.isToken) {
      await actor.updateTokenEffectFromHealth();
    } else {
      const activeTokens = actor.getActiveTokens(true, false);
      const activeScene = getGame().scenes?.active;
      if (activeScene && activeTokens.length) {
        const token = activeScene.getEmbeddedDocument("Token", activeTokens[0].id ?? "") as
          | TokenDocument
          | undefined; // TODO Hardcoded "first" token
        if (token) {
          await actor.updateTokenEffectFromHealth();
        }
      }
    }

    for (const update of usefulLegs) {
      if (update != null && update._id != null) {
        // TODO make sure usefulLegs only contain real data
        const item = actor.items.get(update._id);
        if (item) {
          await item.update(update);
        }
      }
    }

    // Reopen the dialog if there still are wounds left
    if (hitLocation.system.wounds.length) {
      await this.showHealWoundDialog(actor, hitLocation.id!);
    }
  }
}
