import { formatListByWorldLanguage, localize, logMisconfiguration } from "../system/util";
import { Rqid } from "../system/api/rqidApi";

import type { AnyMutableObject } from "fvtt-types/utils";
import Document = foundry.abstract.Document;

export class RqgActiveEffect<
  out SubType extends ActiveEffect.SubType = ActiveEffect.SubType,
> extends ActiveEffect<SubType> {
  static init() {
    CONFIG.ActiveEffect.documentClass = RqgActiveEffect;
    CONFIG.ActiveEffect.legacyTransferral = false;
  }

  /**
   * CUSTOM application mode will apply an ADD effect to a specified item.
   * The format of the key should be "<rqid>:<propertyPath>" like "i.skill.dodge:system.baseChance"
   * The effect will try to find an embedded item with the specified rqid.
   */
  override _applyCustom(
    actor: Actor.Implementation,
    change: ActiveEffect.ChangeData,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    currentP: unknown,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    deltaP: unknown,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    changes: AnyMutableObject,
  ): void {
    const [rqid, path, deprecated] = change.key.split(":"); // ex i.hit-location.head:system.naturalAp
    if (deprecated) {
      const itemsWithEffectsOnActor = formatListByWorldLanguage(
        actor.appliedEffects.map((e) => {
          try {
            return (fromUuidSync(e.origin) as Document.Any)?.name ?? "❓no name";
          } catch {
            return "❓embedded item in compendium"; // origin was in a compendium and could not be read synchronously
          }
        }),
        "disjunction",
      );
      const msg = `Character ${actor.name} has an embedded item with an old style Active Effect [${change.key}], please update to the new syntax: "rqid:system.path". Check these items [${itemsWithEffectsOnActor}]`;
      ui.notifications?.warn(msg, { console: false });
      console.warn("RQG | ", msg);
    }

    const item = actor.getBestEmbeddedDocumentByRqid(rqid);
    if (!item) {
      logMisconfiguration(
        localize("RQG.Foundry.ActiveEffect.TargetItemNotFound", {
          rqid: rqid ?? "",
          actorName: actor.name,
          itemName: Rqid.getDocumentName(rqid),
        }),
        !this.disabled,
        change,
        this,
      );
      return;
    }

    // Determine the data type of the target field
    const current: unknown = foundry.utils.getProperty(item, path as any) ?? null;
    let target = current;
    if (current === null) {
      const model = (game.model?.Item as any)[item.type] || {};
      target = foundry.utils.getProperty(model, path as any) ?? null;
    }
    const targetType = foundry.utils.getType(target);

    // Cast the effect change value to the correct type
    let delta;
    try {
      if (targetType === "Array") {
        const innerType = (target as unknown[]).length
          ? foundry.utils.getType((target as unknown[])[0])
          : "string";
        delta = this.#castArray(change.value, innerType);
      } else {
        delta = this.#castDelta(change.value, targetType);
      }
    } catch {
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
        update = (current as unknown[]).concat(delta);
        break;
      default:
        update = current + delta;
        break;
    }

    try {
      foundry.utils.setProperty(item, path as any, update);
    } catch (e) {
      const msg = `Active Effect on item [${item.name}] in actor [${actor.name}] failed. Probably because of wrong syntax in the active effect attribute key [${change.key}].`;
      ui.notifications?.warn(msg, { console: false });
      console.warn("RQG |", msg, change, e);
    }
  }

  // TODO this is just copied from the ActiveEffect class. Refactor when items use DataModels

  #castDelta(raw: any, type: any) {
    let delta;
    switch (type) {
      case "boolean":
        delta = Boolean(this.#parseOrString(raw));
        break;
      case "number":
        delta = Number.fromString(raw);
        if (Number.isNaN(delta)) {
          delta = 0;
        }
        break;
      case "string":
        delta = String(raw);
        break;
      default:
        delta = this.#parseOrString(raw);
    }
    return delta;
  }

  #castArray(raw: any, type: any) {
    let delta;
    try {
      delta = this.#parseOrString(raw);
      delta = delta instanceof Array ? delta : [delta];
    } catch {
      delta = [raw];
    }
    return delta.map((d) => this.#castDelta(d, type));
  }

  #parseOrString(raw: any) {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
}
