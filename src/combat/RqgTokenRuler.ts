import { getGame } from "../system/util";
import { systemId } from "../system/config";
import { TokenRulerSettingsType } from "../applications/settings/tokenRulerSettings.types";

// @ts-expect-error canvas;
const placeables = foundry.canvas.placeables;

export class RqgTokenRuler extends placeables.tokens.TokenRuler {
  static init() {
    // @ts-expect-error rulerClass
    CONFIG.Token.rulerClass = RqgTokenRuler;
  }

  _getSegmentStyle(waypoint: any): any {
    const style = super._getSegmentStyle(waypoint);
    this.#rangeValueStyle(style, waypoint);
    return style;
  }

  /**
   * Adjusts the grid or segment style based on the token's movement characteristics
   */
  #rangeValueStyle(style: any, waypoint: any) {
    // @ts-expect-error token
    if (!this.token.combatant) {
      // Only show the waypoints for tokens that are in combat.
      style.width = 0;
      return;
    }
    const tokenMovementAction = waypoint.action;
    // @ts-expect-error token
    const actorAttributes = this.token.actor.system.attributes;
    // TODO Duplicated from RqgActor, make more DRY
    const equippedMovementEncumbrancePenalty = Math.min(
      0,
      (actorAttributes.encumbrance.max || 0) - (actorAttributes.encumbrance.equipped || 0),
    );

    // Start by setting the movement decided on the actorSheet
    let move = actorAttributes.move.equipped ?? Infinity;

    // Override with the movement set on the token
    // TODO how to handle the other movement actions?
    switch (tokenMovementAction) {
      case "walk": {
        move = (actorAttributes.move.walk.value ?? 0) + equippedMovementEncumbrancePenalty;
        break;
      }
      case "fly": {
        move = (actorAttributes.move.fly.value ?? 0) + equippedMovementEncumbrancePenalty;
        break;
      }

      case "swim": {
        move = (actorAttributes.move.swim.value ?? 0) + equippedMovementEncumbrancePenalty;
        break;
      }
    }

    const tokenRulerSettings = getGame().settings.get(
      systemId,
      "TokenRulerSettings",
    ) as TokenRulerSettingsType;

    const baseRange = move * 3; // movement in meters (1 MOV = 3 meters), assumes scene grid scale is expressed in meters
    const attackRange = baseRange / 2; // you can move and attack if you move half your  MOV range
    const sprintRange = baseRange * tokenRulerSettings.sprintMultiplier;

    const breakpoints = [
      { range: Infinity, color: tokenRulerSettings.rangeColors.unreachable },
      { range: baseRange, color: tokenRulerSettings.rangeColors.sprint },
      { range: attackRange, color: tokenRulerSettings.rangeColors.walk },
      { range: 0, color: tokenRulerSettings.rangeColors.attack },
    ];

    if (sprintRange > baseRange) {
      breakpoints.push({ range: sprintRange, color: tokenRulerSettings.rangeColors.unreachable });
      breakpoints.sort((a, b) => b.range - a.range);
    }

    style.color =
      breakpoints.find((breakpoint) => breakpoint.range < waypoint.measurement.cost)?.color ??
      tokenRulerSettings.rangeColors.attack;

    // @ts-expect-error uiScale
    const scale = canvas?.dimensions?.uiScale ?? 1;
    style.width = (tokenRulerSettings.lineWidth ?? 12) * scale;

    style.alpha = tokenRulerSettings.alpha ?? 1.0;
  }
}
