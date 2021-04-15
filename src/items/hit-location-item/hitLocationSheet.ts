import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import {
  HitLocationItemData,
  HitLocationsEnum,
  HitLocationTypesEnum,
  limbHealthStatuses,
} from "../../data-model/item-data/hitLocationData";
import { RqgActor } from "../../actors/rqgActor";
import { logBug } from "../../system/util";
import { RqgItemSheet } from "../RqgItemSheet";
import { DamageCalculations } from "../../system/damageCalculations";
import { HealingCalculations } from "../../system/healingCalculations";
import { CharacterActorData } from "../../data-model/actor-data/rqgActorData";
import { HealthEnum } from "../../data-model/actor-data/attributes";

export class HitLocationSheet extends RqgItemSheet {
  static get defaultOptions(): BaseEntitySheet.Options {
    return mergeObject(super.defaultOptions, {
      classes: ["rqg", "sheet", ItemTypeEnum.HitLocation],
      template: "systems/rqg/items/hit-location-item/hitLocationSheet.html",
      width: 320,
      height: 250,
    } as any);
  }

  getData(): HitLocationItemData {
    const sheetData = super.getData() as HitLocationItemData;
    const data = sheetData.data;
    data.hitLocationNamesAll = Object.values(HitLocationsEnum);
    data.hitLocationTypes = Object.values(HitLocationTypesEnum);
    data.limbHealthStatuses = Object.values(limbHealthStatuses);

    return sheetData;
  }

  static showAddWoundDialog(token: Token, actor: RqgActor, hitLocationItemId: string): void {
    if (!actor.isToken) {
      if (actor.data.token.actorLink) {
        // @ts-ignore tokens
        token = canvas.tokens.ownedTokens.find((t) => t.actor.id === actor._id);
        if (!token) {
          ui.notifications?.info("This actor does not have any tokens on the map");
          return;
        }
      } else {
        ui.notifications?.info("This actor template is not linked and was not opened from a token");
        return;
      }
    }

    const hitLocation = actor.getOwnedItem(hitLocationItemId) as Item<HitLocationItemData>;
    const dialogContent =
      '<form><input type="number" id="inflictDamagePoints" name="damage"><br><label><input type="checkbox" name="toTotalHp" checked> Apply to total HP</label><br><label><input type="checkbox" name="subtractAP" checked> Subtract AP</label><br></form>';
    new Dialog(
      {
        title: `Add damage to ${hitLocation.name}`,
        content: dialogContent,
        default: "submit",
        render: () => {
          $("#inflictDamagePoints").focus();
        },
        buttons: {
          submit: {
            icon: '<i class="fas fa-check"></i>',
            label: "Add wound",
            callback: async (html: JQuery | HTMLElement) =>
              await HitLocationSheet.submitAddWoundDialog(
                html as JQuery,
                token,
                actor,
                hitLocation
              ),
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancel",
            callback: () => null,
          },
        },
      },
      {
        classes: ["rqg", "dialog"],
      }
    ).render(true);
  }

  private static async submitAddWoundDialog(
    html: JQuery,
    token: Token,
    actor: RqgActor,
    hitLocation: Item<HitLocationItemData>
  ) {
    if (!actor.isToken) {
      if (actor.data.token.actorLink) {
        // @ts-ignore tokens
        token = canvas.tokens.ownedTokens.find((t) => t.actor.id === actor._id);
        if (!token) {
          ui.notifications?.info("This actor does not have any tokens on the map");
          return;
        }
      } else {
        ui.notifications?.info("This actor template is not linked and was not opened from a token");
        return;
      }
    }

    const formData = new FormData(html.find("form")[0]);
    // @ts-ignore entries
    const data = Object.fromEntries(formData.entries());
    const applyDamageToTotalHp: boolean = !!data.toTotalHp;
    const subtractAP: boolean = !!data.subtractAP;
    let damage = Number(data.damage);
    // const actor = hitLocation.actor as RqgActor;
    if (subtractAP) {
      const ap = hitLocation.data.data.ap;
      if (ap != null) {
        damage = Math.max(0, damage - ap);
      } else {
        logBug(
          `Hit location ${hitLocation.name} doesn't have a calculated total armor point`,
          hitLocation
        );
      }
    }
    const {
      hitLocationUpdates,
      actorUpdates,
      notification,
      addTokenEffects,
      uselessLegs,
    } = DamageCalculations.addWound(damage, applyDamageToTotalHp, hitLocation.data, actor.data);

    notification && ui.notifications?.info(notification, { permanent: true });
    hitLocationUpdates && (await hitLocation.update(hitLocationUpdates));
    actorUpdates && (await token.actor.update(actorUpdates));

    const combinedHealth: HealthEnum = DamageCalculations.getCombinedActorHealth(
      token.actor.data as CharacterActorData
    );

    // TODO testing testing
    const health2Status: Map<HealthEnum, { id: string; label: string; icon: string }> = new Map([
      [HealthEnum.Healthy, CONFIG.statusEffects[31]],
      [HealthEnum.Wounded, CONFIG.statusEffects[21]],
      [HealthEnum.Shock, CONFIG.statusEffects[14]],
      [HealthEnum.Unconscious, CONFIG.statusEffects[1]],
      [HealthEnum.Dead, CONFIG.statusEffects[0]],
    ]);

    // TODO map to actorHealth - sync actorHealth names to statusEffects names?
    // TODO create a CONFIG.RQG.statusEffects that contain AE ?
    const effect = health2Status.get(combinedHealth);
    const asOverlay = effect?.id === "dead";

    // TODO fix typing!
    if (!token.actor.effects.find((e: any) => e.data.flags?.core?.statusId === effect?.id)) {
      await token.toggleEffect(effect as any, { overlay: asOverlay, active: true });
    }

    // for (const e of addTokenEffects) {
    //   if (actor.token) {
    //     await actor.token.toggleEffect(e);
    //   } else {
    //     const tokens = actor.getActiveTokens(true);
    //     for (const t of tokens) {
    //       await t.toggleEffect(e, { active: true });
    //     }
    //   }
    // }

    for (const update of uselessLegs) {
      await actor.getOwnedItem(update._id).update(update);
    }
  }

  static showHealWoundDialog(token: Token, actor: RqgActor, hitLocationItemId: string) {
    const hitLocation = actor.getOwnedItem(hitLocationItemId);
    if (hitLocation.data.type !== ItemTypeEnum.HitLocation) {
      logBug("Edit Wounds did not point to a Hit Location Item", hitLocation);
      return;
    }
    let dialogContent = "<form><label>Select which wound</label><div>";

    hitLocation.data.data.wounds.forEach(
      (wound, i) =>
        (dialogContent += `<input type="radio" name="wound" value="${i}" ${
          !i && "checked"
        }> ${wound}</label><br>`)
    );
    dialogContent +=
      '</div><br><label>Heal <input id="healWoundPoints" type="number" name="heal" min=0 max=99> points</label><br><br></form>';

    new Dialog(
      {
        title: `Heal wound in ${hitLocation.name}`,
        content: dialogContent,
        default: "submit",
        render: () => {
          $("#healWoundPoints").focus();
        },
        buttons: {
          submit: {
            icon: '<i class="fas fa-check"></i>',
            label: "Heal wound",
            callback: async (html: JQuery | HTMLElement) =>
              await HitLocationSheet.submitHealWoundDialog(
                html as JQuery,
                token,
                actor,
                hitLocation as Item<HitLocationItemData>
              ),
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancel",
            callback: () => null,
          },
        },
      },
      {
        classes: ["rqg", "dialog"],
      }
    ).render(true);
  }

  private static async submitHealWoundDialog(
    html: JQuery,
    token: Token,
    actor: RqgActor,
    hitLocation: Item<HitLocationItemData>
  ): Promise<void> {
    const formData = new FormData(html.find("form")[0]);
    // @ts-ignore formData.entries
    const data = Object.fromEntries(formData.entries());
    const hpValue = hitLocation.data.data.hp.value;
    const hpMax = hitLocation.data.data.hp.max;
    if (hpValue == null || hpMax == null) {
      logBug(`Hitlocation ${hitLocation.name} don't have hp value or max`, hitLocation);
      return;
    }
    const healWoundIndex: number = Number(data.wound);
    let healPoints: number = Number(data.heal);

    const {
      hitLocationUpdates,
      actorUpdates,
      removeTokenEffects,
      usefulLegs,
    } = HealingCalculations.healWound(healPoints, healWoundIndex, hitLocation.data, actor.data);

    hitLocationUpdates && (await hitLocation.update(hitLocationUpdates));
    actorUpdates && (await token.actor.update(actorUpdates));

    const combinedHealth = DamageCalculations.getCombinedActorHealth(
      token.actor.data as CharacterActorData
    );

    // TODO map to actorHealth - sync actorHealth names to statusEffects names?
    // TODO create a CONFIG.RQG.statusEffects that contain AE ?
    const effect = CONFIG.statusEffects[4];
    const asOverlay = effect.id === "dead";

    if (!token.actor.effects.find((e: any) => e.data.flags?.core?.statusId === effect.id)) {
      await token.toggleEffect(effect as any, { overlay: asOverlay, active: true });
    }
    // for (const e of removeTokenEffects) {
    //   if (actor.token) {
    //     await actor.token.toggleEffect(e);
    //   } else {
    //     const tokens = actor.getActiveTokens(true);
    //     for (const t of tokens) {
    //       await t.toggleEffect(e, { active: false });
    //     }
    //   }
    // }

    for (const update of usefulLegs) {
      await actor.getOwnedItem(update._id).update(update);
    }
  }
}
