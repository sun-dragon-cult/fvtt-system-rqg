import type { HitLocationName, HitLocationRollOptions } from "./HitLocationRoll.types";
import { isDocumentSubType, localize } from "../../system/util";
import { templatePaths } from "../../system/loadHandlebarsTemplates";
import { ItemTypeEnum } from "@item-model/itemTypes.ts";
import type { RqgItem } from "@items/rqgItem.ts";
import type { RqgActor } from "@actors/rqgActor.ts";
import type { HitLocationItem } from "@item-model/hitLocationData.ts";

/**
 * HitLocationRoll is only displayed as part of the CombatChatMessage,
 * so no "rollAndShow" or flavor is needed.
 */
export class HitLocationRoll extends Roll {
  constructor(formula: string = "1d20", data: any, options: HitLocationRollOptions) {
    super(formula, data, options);
  }

  get hitLocationName(): string {
    const damagedHitLocation = (this.options as HitLocationRollOptions).hitLocationNames
      .filter((hln) => (this.total ?? 0) >= hln.dieFrom && (this.total ?? 0) <= hln.dieTo)
      .map((hln) => hln.name);
    return damagedHitLocation[0] ?? localize("RQG.Roll.HitLocationRoll.FallbackHitLocationName");
  }

  // Html for the "content" of the chat-message
  override async render({ isPrivate = false } = {}) {
    if (!this._evaluated) {
      await this.evaluate();
    }
    const o = this.options as HitLocationRollOptions;
    const chatData = {
      user: game.user!.id,
      tooltip: isPrivate ? "" : await this.getTooltip(),
      total: isPrivate ? "??" : Math.round(this.total! * 100) / 100,
      hitLocationName: isPrivate ? "??" : this.hitLocationName,
      speakerUuid: ChatMessage.getSpeakerActor(o.speaker as any)?.uuid, // Used for hiding parts
    };
    return foundry.applications.handlebars.renderTemplate(templatePaths.hitLocationRoll, chatData);
  }

  // Html for what the hit location formula was
  override async getTooltip(): Promise<string> {
    return foundry.applications.handlebars.renderTemplate(templatePaths.hitLocationTooltip, {
      formula: this.formula,
    });
  }

  /**
   * Transform a token or actor into a list of hit location names to put in the roll options.
   */
  static tokenToHitLocationNames(
    tokenOrActor: TokenDocument | RqgActor | undefined | null,
  ): HitLocationName[] {
    const actor =
      (tokenOrActor instanceof TokenDocument ? tokenOrActor.actor : tokenOrActor) ?? undefined;

    return (
      actor?.items
        .filter((i: RqgItem) => isDocumentSubType<HitLocationItem>(i, ItemTypeEnum.HitLocation))
        .map((hl: HitLocationItem) => ({
          dieFrom: hl.system.dieFrom,
          dieTo: hl.system.dieTo,
          name: hl.name ?? "",
        })) ?? []
    );
  }
}
