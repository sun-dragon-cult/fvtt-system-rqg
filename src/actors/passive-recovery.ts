import { RqgActorSheetV2 } from "./rqg-actor-sheet-v2";
import type { RqgActor } from "./rqg-actor";
import { RqgLogger } from "../system/logging/rqg-logger";
import { isDocumentSubType, localize } from "../system/util";
import { ActorTypeEnum, type CharacterActor } from "../data-model/actor-data/rqg-actor-data";

const logger = new RqgLogger("Passive Recovery");

async function recoverActor(actor: RqgActor): Promise<void> {
  for (const recover of [
    () => actor.catchUpMagicPointRecovery(),
    () => actor.catchUpNaturalHealing(),
  ]) {
    try {
      await recover();
    } catch (error) {
      logger.error(
        localize("RQG.Actor.Attributes.AutomaticRecoveryFailed", { name: actor.name ?? "" }),
        {},
        actor.uuid,
        error,
      );
    }
  }
}

/**
 * Passive Magic Point recovery (#1028) and natural Hit Point healing (#436): a sheet already open
 * won't otherwise notice worldTime advancing (a calendar module, or the GM manually moving the
 * clock) since nothing re-renders it. `updateWorldTime` fires on every client whenever worldTime
 * changes, regardless of cause, so catch up any currently-open, owned player character sheets here -
 * each catch-up write updates the actor, and Foundry's own DocumentSheet machinery re-renders
 * every open sheet for that actor (including on other clients) from there, same as any other
 * actor update.
 */
export function initCharacterPassiveRecovery() {
  Hooks.on("updateWorldTime", () => {
    for (const app of foundry.applications.instances.values()) {
      if (
        app instanceof RqgActorSheetV2 &&
        app.rendered &&
        app.actor.isOwner &&
        app.actor.hasPlayerOwner
      ) {
        void recoverActor(app.actor);
      }
    }
    if (!game.users?.activeGM?.isSelf) {
      return;
    }
    const npcs = new Set<RqgActor>();
    for (const actor of game.actors?.contents ?? []) {
      if (
        isDocumentSubType<CharacterActor>(actor, ActorTypeEnum.Character) &&
        !actor.hasPlayerOwner
      ) {
        npcs.add(actor);
      }
    }
    // Unlinked tokens have independent wounds, MP, and recovery checkpoints, even off-scene.
    for (const scene of game.scenes?.contents ?? []) {
      for (const token of scene.tokens) {
        if (!token.actorLink && token.actor && !token.actor.hasPlayerOwner) {
          npcs.add(token.actor);
        }
      }
    }
    for (const actor of npcs) {
      void recoverActor(actor);
    }
  });
}
