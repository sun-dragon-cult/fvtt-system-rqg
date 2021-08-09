import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import {
  HitLocationItemData,
  HitLocationsEnum,
  HitLocationTypesEnum,
  hitLocationHealthStatuses,
  HitLocationData,
} from "../../data-model/item-data/hitLocationData";
import { RqgActor } from "../../actors/rqgActor";
import { RqgError } from "../../system/util";
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

  getData(): any {
    const context = super.getData() as any;
    const hitLocationData = (context.hitLocationData = context.data.data) as HitLocationData;
    const sheetSpecific: any = (context.sheetSpecific = {});

    sheetSpecific.allHitLocations = Object.values(HitLocationsEnum);
    sheetSpecific.hitLocationTypes = Object.values(HitLocationTypesEnum);
    sheetSpecific.hitLocationHealthStatuses = Object.values(hitLocationHealthStatuses);
    sheetSpecific.actorHealthImpacts = Object.values(actorHealthStatuses);
    return context;
  }

  static showAddWoundDialog(actor: RqgActor, hitLocationItemId: string, speakerName: string): void {
    const hitLocation = actor.items.get(hitLocationItemId);
    if (!hitLocation || hitLocation.data.type !== ItemTypeEnum.HitLocation) {
      const msg = `Couldn't find hitlocation with itemId [${hitLocationItemId}] on actor ${actor.name} to show add wound dialog.`;
      ui.notifications?.error(msg);
      throw new RqgError(msg);
    }

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
                actor,
                hitLocation as any, // TODO *** !!! ***
                speakerName
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
    actor: RqgActor,
    hitLocation: Item<HitLocationItemData>,
    speakerName: string
  ) {
    const formData = new FormData(html.find("form")[0]);
    // @ts-ignore entries
    const data = Object.fromEntries(formData.entries());
    const applyDamageToTotalHp: boolean = !!data.toTotalHp;
    const subtractAP: boolean = !!data.subtractAP;
    let damage = Number(data.damage);
    if (subtractAP) {
      const ap = hitLocation.data.data.ap;
      if (ap == null) {
        const msg = `Hit location ${hitLocation.name} doesn't have a calculated total armor point`;
        ui.notifications?.error(msg);
        throw new RqgError(msg, hitLocation);
      }
      damage = Math.max(0, damage - ap);
    }
    const actorHealthBefore = actor.data.data.attributes.health;
    const { hitLocationUpdates, actorUpdates, notification, uselessLegs } =
      DamageCalculations.addWound(
        damage,
        applyDamageToTotalHp,
        hitLocation.data,
        actor.data,
        speakerName
      );

    await ChatMessage.create({
      user: game.user?.id,
      speaker: { alias: speakerName },
      content: `${speakerName} takes a hit to ${hitLocation.name}. ${notification}`,
      whisper: game.users?.filter((u) => (u.isGM && u.active) || u.id === game.user?.id),
      type: CONST.CHAT_MESSAGE_TYPES.WHISPER,
    });
    hitLocationUpdates && (await hitLocation.update(hitLocationUpdates));
    actorUpdates && (await actor.update(actorUpdates));

    if (actor.isToken) {
      // @ts-ignore 0.8
      await HitLocationSheet.setTokenEffect(actor.token!.object, actorHealthBefore);
    } else {
      const activeTokens = actor.getActiveTokens(true);
      activeTokens.length &&
        (await HitLocationSheet.setTokenEffect(activeTokens[0], actorHealthBefore));
    }

    for (const update of uselessLegs) {
      const leg = actor.items.get(update._id);
      if (!leg || leg.data.type !== ItemTypeEnum.HitLocation) {
        const msg = "Useless leg did not point to a Hit Location Item";
        ui.notifications?.error(msg);
        throw new RqgError(msg, hitLocation);
      }
      await leg.update(update);
    }
  }

  static showHealWoundDialog(actor: RqgActor, hitLocationItemId: string) {
    const hitLocation = actor.items.get(hitLocationItemId);
    if (!hitLocation || hitLocation.data.type !== ItemTypeEnum.HitLocation) {
      const msg = "Edit Wounds did not point to a Hit Location Item";
      ui.notifications?.error(msg);
      throw new RqgError(msg, hitLocation);
    }
    let dialogContent = "<form><label>Select which wound to heal</label><div class='woundlist'>";

    hitLocation.data.data.wounds.forEach(
      (wound, i) =>
        (dialogContent += `<label><input type="radio" name="wound" value="${i}" ${
          !i && "checked"
        }> ${wound}</label> &nbsp;`)
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
        classes: ["rqg", "dialog", "heal-wound"],
      }
    ).render(true);
  }

  private static async submitHealWoundDialog(
    html: JQuery,
    actor: RqgActor,
    hitLocation: Item<HitLocationItemData>
  ): Promise<void> {
    const formData = new FormData(html.find("form")[0]);
    // @ts-ignore formData.entries
    const data = Object.fromEntries(formData.entries());
    const hpValue = hitLocation.data.data.hp.value;
    const hpMax = hitLocation.data.data.hp.max;
    if (hpValue == null || hpMax == null) {
      const msg = `Hitlocation ${hitLocation.name} don't have hp value or max`;
      ui.notifications?.error(msg);
      throw new RqgError(msg, hitLocation);
    }
    const healWoundIndex: number = Number(data.wound);
    let healPoints: number = Number(data.heal);
    const actorHealthBefore = actor.data.data.attributes.health;
    const { hitLocationUpdates, actorUpdates, usefulLegs } = HealingCalculations.healWound(
      healPoints,
      healWoundIndex,
      hitLocation.data,
      actor.data
    );

    hitLocationUpdates && (await hitLocation.update(hitLocationUpdates));
    actorUpdates && (await actor.update(actorUpdates));

    if (actor.isToken) {
      // @ts-ignore 0.8
      await HitLocationSheet.setTokenEffect(actor.token!.object, actorHealthBefore);
    } else {
      const activeTokens = actor.getActiveTokens(true);
      activeTokens.length &&
        (await HitLocationSheet.setTokenEffect(activeTokens[0], actorHealthBefore));
    }

    for (const update of usefulLegs) {
      const item = actor.items.get(update._id);
      item && (await item.update(update));
    }

    // Reopen the dialog if there still are wounds left
    if (hitLocation.data.data.wounds.length) {
      this.showHealWoundDialog(actor, hitLocation.id);
    }
  }

  static async setTokenEffect(token: Token, actorHealthBefore: ActorHealthState): Promise<void> {
    // // TODO testing testing - lägg i nån CONFIG?
    const health2Effect: Map<ActorHealthState, { id: string; label: string; icon: string }> =
      new Map([
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
        (await token.toggleEffect(previousEffect as any, {
          overlay: asOverlay,
          active: true,
        }));
    }
  }
}
