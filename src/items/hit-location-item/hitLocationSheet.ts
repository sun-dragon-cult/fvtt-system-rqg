import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import {
  HitLocationItemData,
  HitLocationsEnum,
  HitLocationTypesEnum,
  hitLocationHealthStatuses,
} from "../../data-model/item-data/hitLocationData";
import { RqgActor } from "../../actors/rqgActor";
import { logBug } from "../../system/util";
import { RqgItemSheet } from "../RqgItemSheet";
import { DamageCalculations } from "../../system/damageCalculations";
import { HealingCalculations } from "../../system/healingCalculations";
import { ActorHealthState, actorHealthStatuses } from "../../data-model/actor-data/attributes";

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
    data.hitLocationHealthStatuses = Object.values(hitLocationHealthStatuses);
    data.actorHealthImpacts = Object.values(actorHealthStatuses);
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
    if (subtractAP) {
      const ap = hitLocation.data.data.ap;
      if (ap != null) {
        damage = Math.max(0, damage - ap);
      } else {
        logBug(
          `Hit location ${hitLocation.name} doesn't have a calculated total armor point`,
          true,
          hitLocation
        );
      }
    }
    const actorHealthBefore = (token.actor as RqgActor).data.data.attributes.health;
    const {
      hitLocationUpdates,
      actorUpdates,
      notification,
      uselessLegs,
    } = DamageCalculations.addWound(damage, applyDamageToTotalHp, hitLocation.data, actor.data);

    await ChatMessage.create({
      user: game.user?._id,
      speaker: ChatMessage.getSpeaker({ token: token }),
      content: `${token.name} Takes a hit to ${hitLocation.name}. ${notification}`,
      whisper: game.users?.filter((u) => (u.isGM && u.active) || u._id === game.user?._id),
      type: CONST.CHAT_MESSAGE_TYPES.WHISPER,
    });
    hitLocationUpdates && (await hitLocation.update(hitLocationUpdates));
    actorUpdates && (await token.actor.update(actorUpdates));

    await HitLocationSheet.setTokenEffect(token, actorHealthBefore);
    for (const update of uselessLegs) {
      await actor.getOwnedItem(update._id).update(update);
    }
  }

  static showHealWoundDialog(token: Token, actor: RqgActor, hitLocationItemId: string) {
    const hitLocation = actor.getOwnedItem(hitLocationItemId);
    if (hitLocation.data.type !== ItemTypeEnum.HitLocation) {
      logBug("Edit Wounds did not point to a Hit Location Item", true, hitLocation);
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
      logBug(`Hitlocation ${hitLocation.name} don't have hp value or max`, true, hitLocation);
      return;
    }
    const healWoundIndex: number = Number(data.wound);
    let healPoints: number = Number(data.heal);

    const actorHealthBefore = (token.actor as RqgActor).data.data.attributes.health;

    const { hitLocationUpdates, actorUpdates, usefulLegs } = HealingCalculations.healWound(
      healPoints,
      healWoundIndex,
      hitLocation.data,
      actor.data
    );

    hitLocationUpdates && (await hitLocation.update(hitLocationUpdates));
    actorUpdates && (await token.actor.update(actorUpdates));

    HitLocationSheet.setTokenEffect(token, actorHealthBefore);

    for (const update of usefulLegs) {
      await actor.getOwnedItem(update._id).update(update);
    }
  }

  static async setTokenEffect(token: Token, actorHealthBefore: ActorHealthState): Promise<void> {
    // // TODO testing testing - lägg i nån CONFIG?
    const health2Effect: Map<
      ActorHealthState,
      { id: string; label: string; icon: string }
    > = new Map([
      ["shock", CONFIG.statusEffects[14]],
      ["unconscious", CONFIG.statusEffects[1]],
      ["dead", CONFIG.statusEffects[0]],
    ]);

    // TODO map to actorHealth - sync actorHealth names to statusEffects names?
    // TODO create a CONFIG.RQG.statusEffects that contain AE ?

    const previousEffect = health2Effect.get(actorHealthBefore);
    const newEffect = health2Effect.get(token.actor.data.data.attributes.health);

    if (newEffect?.label !== previousEffect?.label) {
      const asOverlay = newEffect?.id === "dead";
      const newEffectIsOn = !!token.actor.effects.find(
        (e: ActiveEffect) => e.getFlag("core", "statusId") === newEffect?.id
      );
      const previousEffectIsOn = !!token.actor.effects.find(
        (e: ActiveEffect) => e.getFlag("core", "statusId") === previousEffect?.id
      );

      const shouldToggleNewEffect = !!newEffect && !newEffectIsOn;
      const shouldTogglePreviousEffect = !!previousEffect && previousEffectIsOn;

      shouldToggleNewEffect &&
        (await token.toggleEffect(newEffect as any, { overlay: asOverlay, active: true }));
      shouldTogglePreviousEffect &&
        (await token.toggleEffect(previousEffect as any, { overlay: asOverlay, active: true }));
    }
  }
}
