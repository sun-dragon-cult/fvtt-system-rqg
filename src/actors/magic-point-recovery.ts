import { RqgActorSheetV2 } from "./rqg-actor-sheet-v2";

/**
 * Passive Magic Point recovery (#1028): a sheet already open won't otherwise notice worldTime
 * advancing (a calendar module, or the GM manually moving the clock) since nothing re-renders
 * it. `updateWorldTime` fires on every client whenever worldTime changes, regardless of cause,
 * so catch up any currently-open, owned character sheets here - each catch-up write updates the
 * actor, and Foundry's own DocumentSheet machinery re-renders every open sheet for that actor
 * (including on other clients) from there, same as any other actor update.
 */
export function initCharacterMagicPointRecovery() {
  Hooks.on("updateWorldTime", () => {
    for (const app of foundry.applications.instances.values()) {
      if (app instanceof RqgActorSheetV2 && app.rendered && app.actor.isOwner) {
        void app.actor.catchUpMagicPointRecovery();
      }
    }
  });
}
