import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import {
  HitLocationDataProperties,
  HitLocationDataPropertiesData,
  hitLocationHealthStatuses,
  HitLocationTypesEnum,
} from "../../data-model/item-data/hitLocationData";
import { RqgActor } from "../../actors/rqgActor";
import {
  assertItemType,
  getGame,
  getHitLocations,
  requireValue,
  RqgError,
  usersThatOwnActor,
} from "../../system/util";
import { RqgItemSheet } from "../RqgItemSheet";
import { DamageCalculations } from "../../system/damageCalculations";
import { HealingCalculations } from "../../system/healingCalculations";
import { ActorHealthState } from "../../data-model/actor-data/attributes";
import { RqgItem } from "../rqgItem";
import { RqgToken } from "../../combat/rqgToken";

interface HitLocationSheetData {
  isEmbedded: boolean;
  data: HitLocationDataProperties; // Actually contains more...complete with effects, flags etc
  hitLocationData: HitLocationDataPropertiesData;
  sheetSpecific: {
    allHitLocations: string[];
    hitLocationTypes: string[];
    hitLocationHealthStatuses: string[];
  };
}

export class HitLocationSheet extends RqgItemSheet<
  ItemSheet.Options,
  HitLocationSheetData | ItemSheet.Data
> {
  static get defaultOptions(): ItemSheet.Options {
    return mergeObject(super.defaultOptions, {
      classes: ["rqg", "sheet", ItemTypeEnum.HitLocation],
      template: "systems/rqg/items/hit-location-item/hitLocationSheet.hbs",
      width: 320,
      height: 250,
    });
  }

  getData(): HitLocationSheetData | ItemSheet.Data {
    const itemData = this.document.data.toObject(false);
    assertItemType(itemData.type, ItemTypeEnum.HitLocation);

    // if (this.item.img === "icons/svg/item-bag.svg") {
    //   this.item.update({ img: "/systems/rqg/assets/images/items/hit-location.svg" }, {});
    // }

    return {
      cssClass: this.isEditable ? "editable" : "locked",
      editable: this.isEditable,
      limited: this.document.limited,
      owner: this.document.isOwner,
      isEmbedded: this.document.isEmbedded,
      options: this.options,
      data: itemData,
      hitLocationData: itemData.data,
      sheetSpecific: {
        allHitLocations: getHitLocations(),
        hitLocationTypes: Object.values(HitLocationTypesEnum),
        hitLocationHealthStatuses: Object.values(hitLocationHealthStatuses),
      },
    };
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
                hitLocation,
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
    hitLocation: RqgItem,
    speakerName: string
  ) {
    assertItemType(hitLocation.data.type, ItemTypeEnum.HitLocation);
    const formData = new FormData(html.find("form")[0]);
    // @ts-ignore entries
    const data = Object.fromEntries(formData.entries());
    const applyDamageToTotalHp: boolean = !!data.toTotalHp;
    const subtractAP: boolean = !!data.subtractAP;
    let damage = Number(data.damage);
    if (subtractAP) {
      const armorPoints = hitLocation.data.data.armorPoints;
      if (armorPoints == null) {
        const msg = `Hit location ${hitLocation.name} doesn't have a calculated total armor point`;
        ui.notifications?.error(msg);
        throw new RqgError(msg, hitLocation);
      }
      damage = Math.max(0, damage - armorPoints);
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
      user: getGame().user?.id,
      speaker: { alias: speakerName },
      content: `${speakerName} takes a hit to ${hitLocation.name}. ${notification}`,
      whisper: usersThatOwnActor(actor),
    });
    hitLocationUpdates && (await hitLocation.update(hitLocationUpdates));
    actorUpdates && (await actor.update(actorUpdates as any)); // TODO fix type

    if (actor.isToken && actor.token) {
      await HitLocationSheet.setTokenEffect(actor.token.object as RqgToken, actorHealthBefore);
    } else {
      const activeTokens = actor.getActiveTokens(true);
      const sceneTokens = getGame().scenes?.active?.data.tokens;
      if (activeTokens.length && sceneTokens) {
        const token = sceneTokens.find((t) => t.id === activeTokens[0].id);
        token &&
          (await HitLocationSheet.setTokenEffect(token.object as RqgToken, actorHealthBefore));
      }
    }

    for (const update of uselessLegs) {
      // @ts-ignore _id
      const leg = actor.items.get(update._id);
      assertItemType(leg?.data.type, ItemTypeEnum.HitLocation);
      await leg.update(update);
    }
  }

  static showHealWoundDialog(actor: RqgActor, hitLocationItemId: string) {
    const hitLocation = actor.items.get(hitLocationItemId);
    assertItemType(hitLocation?.data.type, ItemTypeEnum.HitLocation);

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
              await HitLocationSheet.submitHealWoundDialog(html as JQuery, actor, hitLocation),
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
    hitLocation: RqgItem
  ): Promise<void> {
    assertItemType(hitLocation.data.type, ItemTypeEnum.HitLocation);
    const formData = new FormData(html.find("form")[0]);
    // @ts-ignore formData.entries
    const data = Object.fromEntries(formData.entries());
    requireValue(
      hitLocation.data.data.hitPoints.value,
      `No value on hitlocation ${hitLocation.name}`
    );
    requireValue(hitLocation.data.data.hitPoints.max, `No max on hitlocation ${hitLocation.name}`);
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
      actor.token &&
        (await HitLocationSheet.setTokenEffect(actor.token.object as RqgToken, actorHealthBefore));
    } else {
      const activeTokens = actor.getActiveTokens(true, false);
      const activeScene = getGame().scenes?.active;
      if (activeScene && activeTokens.length) {
        const token = activeScene.getEmbeddedDocument("Token", activeTokens[0].id ?? "") as
          | TokenDocument
          | undefined; // TODO Hardcoded "first" token
        token &&
          (await HitLocationSheet.setTokenEffect(token.object as RqgToken, actorHealthBefore));
      }
    }

    for (const update of usefulLegs) {
      if (update != null && update._id != null) {
        // TODO make sure usefulLegs only contain real data
        const item = actor.items.get(update._id);
        item && (await item.update(update));
      }
    }

    // Reopen the dialog if there still are wounds left
    if (hitLocation.data.data.wounds.length) {
      this.showHealWoundDialog(actor, hitLocation.id!);
    }
  }

  static async setTokenEffect(token: RqgToken, actorHealthBefore: ActorHealthState): Promise<void> {
    // // TODO testing testing - lägg i nån CONFIG?
    const health2Effect: Map<ActorHealthState, { id: string; label: string; icon: string }> =
      new Map([
        ["shock", CONFIG.statusEffects[14]],
        ["unconscious", CONFIG.statusEffects[1]],
        ["dead", CONFIG.statusEffects[0]],
      ]);

    // TODO map to actorHealth - sync actorHealth names to statusEffects names?
    // TODO create a CONFIG.RQG.statusEffects that contain AE ?

    if (!token.actor) {
      ui.notifications?.warn("no actor on token???");
      return;
    }

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
        (await token.toggleEffect(newEffect, { overlay: asOverlay, active: true }));
      shouldTogglePreviousEffect &&
        (await token.toggleEffect(previousEffect, {
          overlay: asOverlay,
          active: true,
        }));
    }
  }
}
