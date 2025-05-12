import type { HitLocationName, HitLocationRollOptions } from "./HitLocationRoll.types";
import { getGameUser, localize } from "../../system/util";
import { templatePaths } from "../../system/loadHandlebarsTemplates";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import type { RqgItem } from "../../items/rqgItem";

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
  async render({ isPrivate = false } = {}) {
    if (!this._evaluated) {
      await this.evaluate();
    }
    const o = this.options as HitLocationRollOptions;
    const chatData = {
      user: getGameUser().id,
      tooltip: isPrivate ? "" : await this.getTooltip(),
      total: isPrivate ? "??" : Math.round(this.total! * 100) / 100,
      hitLocationName: isPrivate ? "??" : this.hitLocationName,
      speakerUuid: ChatMessage.getSpeakerActor(o.speaker as any)?.uuid, // Used for hiding parts
    };
    // @ts-expect-error applications
    return foundry.applications.handlebars.renderTemplate(templatePaths.hitLocationRoll, chatData);
  }

  // Html for what the hit location formula was
  async getTooltip(): Promise<string> {
    // @ts-expect-error applications
    return foundry.applications.handlebars.renderTemplate(templatePaths.hitLocationTooltip, {
      formula: this.formula,
    });
  }

  /**
   * Transform a token into a list of hit location names to put in the roll options.
   */
  static tokenToHitLocationNames(token: TokenDocument | undefined | null): HitLocationName[] {
    return (
      token?.actor?.items
        .filter((i: RqgItem) => i.type === ItemTypeEnum.HitLocation)
        .map((hl: RqgItem) => ({
          dieFrom: hl.system.dieFrom,
          dieTo: hl.system.dieTo,
          name: hl.name ?? "",
        })) ?? []
    );
  }
}
