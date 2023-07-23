import { formatListByWorldLanguage, localize, logMisconfiguration } from "../system/util";
import { EffectChangeData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/effectChangeData";
import { RqgActor } from "../actors/rqgActor";
import { Rqid } from "../system/api/rqidApi";

export class RqgActiveEffect extends ActiveEffect {
  static init() {
    CONFIG.ActiveEffect.documentClass = RqgActiveEffect;
    // @ts-expect-error legacyTransferral
    CONFIG.ActiveEffect.legacyTransferral = false;
  }

  declare changes: any; // type workaround

  /**
   * CUSTOM application mode will apply an ADD effect to a specified item.
   * The format of the key should be "<rqid>:<propertyPath>" like "i.skill.dodge:system.baseChance"
   * The effect will try to find an embedded item with the specified rqid.
   */
  _applyCustom(actor: RqgActor, change: EffectChangeData): void {
    const [rqid, path, deprecated] = change.key.split(":"); // ex i.hit-location.head:system.naturalAp
    if (deprecated) {
      const itemsWithEffectsOnActor = formatListByWorldLanguage(
        actor.appliedEffects.map((e) => {
          try {
            // @ts-expect-error fromUuidSync
            return fromUuidSync(e.origin)?.name ?? "❓no name";
          } catch (e) {
            return "❓embedded item in compendium"; // origin was in a compendium and could not be read synchronously
          }
        }),
        "disjunction",
      );
      const msg = `Character ${actor.name} has an embedded item with an old style Active Effect [${change.key}], please update to the new syntax: "rqid:system.path". Check these items [${itemsWithEffectsOnActor}]`;
      // @ts-expect-error console
      ui.notifications?.warn(msg, { console: false });
      console.warn("RQG | ", msg);
    }

    const item = actor.getBestEmbeddedDocumentByRqid(rqid);
    if (!item) {
      logMisconfiguration(
        localize("RQG.Foundry.ActiveEffect.TargetItemNotFound", {
          rqid: rqid,
          actorName: actor.name,
          itemName: Rqid.getDocumentName(rqid),
        }),
        // @ts-expect-error system
        !this.disabled,
        change,
        this,
      );
      return;
    }

    // Determine the data type of the target field
    const current = foundry.utils.getProperty(item, path) ?? null;
    let target = current;
    if (current === null) {
      // @ts-expect-error game.model
      const model = game.model.Item[item.type] || {};
      target = foundry.utils.getProperty(model, path) ?? null;
    }
    const targetType = foundry.utils.getType(target);

    // Cast the effect change value to the correct type
    let delta;
    try {
      if (targetType === "Array") {
        const innerType = target.length ? foundry.utils.getType(target[0]) : "string";
        // @ts-expect-error _castArray
        delta = this._castArray(change.value, innerType);
        // @ts-expect-error _castDelta
      } else delta = this._castDelta(change.value, targetType);
    } catch (err) {
      console.warn(
        `Item [${item.id}] | Unable to parse active effect change for ${change.key}: "${change.value}"`,
      );
      return;
    }

    let update;
    const ct = foundry.utils.getType(current);
    switch (ct) {
      case "boolean":
        update = current || delta;
        break;
      case "null":
        update = delta;
        break;
      case "Array":
        update = current.concat(delta);
        break;
      default:
        update = current + delta;
        break;
    }

    try {
      foundry.utils.setProperty(item, path, update);
    } catch (e) {
      const msg = `Active Effect on item [${item.name}] in actor [${actor.name}] failed. Probably because of wrong syntax in the active effect attribute key [${change.key}].`;
      ui.notifications?.warn(msg);
      console.warn("RQG |", msg, change, e);
    }
  }
}
