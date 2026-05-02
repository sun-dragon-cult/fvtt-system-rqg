import {
  formatListByWorldLanguage,
  isDocumentSubType,
  localize,
  logMisconfiguration,
} from "../system/util";
import { Rqid } from "../system/api/rqidApi";
import { toRqidString } from "../system/api/rqidValidation";

import type { AnyMutableObject } from "fvtt-types/utils";
import Document = foundry.abstract.Document;
import { ActorTypeEnum, type CharacterActor } from "../data-model/actor-data/rqgActorData";

export class RqgActiveEffect extends ActiveEffect<ActiveEffect.SubType> {
  static init() {
    CONFIG.ActiveEffect.documentClass = RqgActiveEffect as any;
    CONFIG.ActiveEffect.legacyTransferral = false;
  }

  /**
   * CUSTOM application mode will apply an ADD effect to a specified item.
   * The format of the key should be "<rqid>:<propertyPath>" like "i.skill.dodge:system.baseChance"
   * The effect will try to find an embedded item with the specified rqid.
   * Prefix the rqid with ~ to use it as a regex and apply the effect to all matching items,
   * like "~i.hit-location:system.naturalAp" to affect all hit location items on the actor.
   */
  static _applyChangeCustom(
    targetDoc: Actor.Implementation,
    change: ActiveEffect.ChangeData,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    currentP: unknown,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    deltaP: unknown,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    changes: AnyMutableObject,
  ): void {
    const effect = (change as any).effect as RqgActiveEffect | undefined;
    const [rqidOrPattern, path, deprecated] = change.key.split(":"); // ex i.hit-location.head:system.naturalAp
    if (deprecated) {
      const itemsWithEffectsOnActor = formatListByWorldLanguage(
        targetDoc.appliedEffects.map((e) => {
          try {
            return (fromUuidSync(e.origin) as Document.Any)?.name ?? "❓no name";
          } catch {
            return "❓embedded item in compendium"; // origin was in a compendium and could not be read synchronously
          }
        }),
        "disjunction",
      );
      const msg = `Character ${targetDoc.name} has an embedded item with an old style Active Effect [${change.key}], please update to the new syntax: "rqid:system.path". Check these items [${itemsWithEffectsOnActor}]`;
      ui.notifications?.warn(msg, { console: false });
      console.warn("RQG | ", msg);
    }

    const isMultiMatch = rqidOrPattern !== undefined && rqidOrPattern.startsWith("~");
    const rqid = isMultiMatch ? rqidOrPattern.slice(1) : rqidOrPattern;

    const items = [];
    if (isDocumentSubType<CharacterActor>(targetDoc, ActorTypeEnum.Character)) {
      if (isMultiMatch) {
        items.push(...targetDoc.getEmbeddedDocumentsByRqidRegex(rqid ?? ""));
      } else {
        const bestMatch = targetDoc.getBestEmbeddedDocumentByRqid(toRqidString(rqid));
        if (bestMatch) {
          items.push(bestMatch);
        }
      }
    }

    if (items.length === 0) {
      logMisconfiguration(
        localize("RQG.Foundry.ActiveEffect.TargetItemNotFound", {
          rqid: rqidOrPattern ?? "",
          actorName: targetDoc.name,
          itemName: Rqid.getDocumentName(rqid),
        }),
        !effect?.disabled,
        change,
        effect,
      );
      return;
    }

    for (const item of items) {
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
      } catch (e) {
        console.warn(
          `Item [${item.id}] | Unable to parse active effect change for ${change.key}: "${change.value}"`,
          e,
        );
        continue;
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
        const msg = `Active Effect on item [${item.name}] in actor [${targetDoc.name}] failed. Probably because of wrong syntax in the active effect attribute key [${change.key}].`;
        ui.notifications?.warn(msg, { console: false });
        console.warn("RQG |", msg, change, e);
      }
    }
  }

  // TODO this is just copied from the ActiveEffect class. Refactor when items use DataModels

  static #castDelta(raw: any, type: any) {
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

  static #castArray(raw: any, type: any) {
    let delta;
    try {
      delta = this.#parseOrString(raw);
      delta = delta instanceof Array ? delta : [delta];
    } catch {
      delta = [raw];
    }
    return delta.map((d) => this.#castDelta(d, type));
  }

  static #parseOrString(raw: any) {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
}
