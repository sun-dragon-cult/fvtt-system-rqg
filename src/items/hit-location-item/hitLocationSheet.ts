import { ItemTypeEnum } from "@item-model/itemTypes.ts";
import {
  type HitLocationHealthState,
  hitLocationHealthStatusOptions,
  type HitLocationItem,
  HitLocationTypesEnum,
} from "@item-model/hitLocationData.ts";
import { RqgActor } from "@actors/rqgActor.ts";
import {
  assertDocumentSubType,
  getSelectHitLocationOptions,
  localize,
  requireValue,
  RqgError,
} from "../../system/util";
import { RqgItemSheet } from "../RqgItemSheet";
import { HealingCalculations } from "../../system/healingCalculations";
import { RqgItem } from "../rqgItem";
import { systemId } from "../../system/config";
import type { ItemSheetData } from "../shared/sheetInterfaces.types.ts";
import { templatePaths } from "../../system/loadHandlebarsTemplates";
import { damageType } from "@item-model/weaponData.ts";
import { ActorTypeEnum, type CharacterActor } from "../../data-model/actor-data/rqgActorData.ts";

interface HitLocationSheetData {
  allHitLocationOptions: SelectOptionData<string>[];
  hitLocationTypeOptions: SelectOptionData<HitLocationTypesEnum>[];
  hitLocationHealthStatusOptions: SelectOptionData<HitLocationHealthState>[];
  rqid: string;
}

export class HitLocationSheet extends RqgItemSheet {
  static override get defaultOptions(): ItemSheet.Options {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: [systemId, "item-sheet", "sheet", ItemTypeEnum.HitLocation],
      template: templatePaths.itemHitLocationSheet,
      width: 600,
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

  override getData(): HitLocationSheetData & ItemSheetData {
    const system = foundry.utils.duplicate(this.document._source.system);
    system.hitPoints = this.document.system.hitPoints; // Use the actor derived values
    system.armorPoints = this.document.system.armorPoints; // Use the actor derived value

    return {
      id: this.document.id ?? "",
      uuid: this.document.uuid,
      rqid: this.document.flags?.[systemId]?.documentRqidFlags?.id ?? "",
      name: this.document.name ?? "",
      img: this.document.img ?? "",
      isGM: game.user?.isGM ?? false,
      isEmbedded: this.document.isEmbedded,
      system: system,

      allHitLocationOptions: getSelectHitLocationOptions(),
      hitLocationHealthStatusOptions: hitLocationHealthStatusOptions,
      hitLocationTypeOptions: Object.values(HitLocationTypesEnum).map((type) => ({
        value: type,
        label: "RQG.Item.HitLocationType." + type,
      })),
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
    assertDocumentSubType<HitLocationItem>(hitLocation, [ItemTypeEnum.HitLocation]);
    const formData = new FormData(html.find("form")[0]);
    const data = Object.fromEntries(formData.entries());
    const applyDamageToTotalHp: boolean = !!data.toTotalHp;
    const ignoreAP: boolean = !data.subtractAP;
    const damage = Number(data.damage);

    actor.applyDamage(
      damage,
      hitLocation.system.dieFrom,
      ignoreAP,
      applyDamageToTotalHp,
      damageType.Impale, // TODO add dropdown to dialog? For now use Impale (still unused)
      // TODO add dropdown to dialog for choosing successLevel as well? Probably overkill
    );
  }

  static async showHealWoundDialog(actor: RqgActor, hitLocationItemId: string) {
    assertDocumentSubType<CharacterActor>(actor, [ActorTypeEnum.Character]);
    const hitLocation = actor.items.get(hitLocationItemId);
    assertDocumentSubType<HitLocationItem>(hitLocation, [ItemTypeEnum.HitLocation]);

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
    assertDocumentSubType<HitLocationItem>(hitLocation, [ItemTypeEnum.HitLocation]);
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
      const currentScene = game.scenes?.current;
      if (currentScene && activeTokens.length) {
        // TODO could be a bug if the actor has tokens in multiple scenes maybe. then getting activeTokens[0] could be wrong. Should check that the scene match?
        const token = currentScene.getEmbeddedDocument("Token", activeTokens[0].id ?? "") as
          | TokenDocument
          | undefined;
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
