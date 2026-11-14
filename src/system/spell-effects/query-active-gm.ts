import { hasActiveGm, localize } from "../util";
import { RqgLogger } from "../logging/rqg-logger";

const logger = new RqgLogger("query-active-gm");

type RqgQuery =
  "rqg.applySpellBehavior" | "rqg.createSpellArea" | "rqg.summon" | "rqg.continueSpellCast";

/** Resolves when `gm` logs out, so a query to them stops waiting; `stop` removes the hook. */
function gmLeaves(gm: User): { left: Promise<void>; stop: () => void } {
  let hookId = 0;
  const left = new Promise<void>((resolve) => {
    hookId = Hooks.on("userConnected", (user: User, connected: boolean) => {
      if (user.id === gm.id && !connected) {
        resolve();
      }
    });
  });
  return { left, stop: () => Hooks.off("userConnected", hookId) };
}

/**
 * Run one of the system's queries on the active GM's client, for what players may not do. Warns,
 * naming the spell, when no GM is logged in, the GM logs out before answering, or the query fails.
 * A GM who is only slow is waited for: their work goes on either way.
 */
export async function queryActiveGm<Q extends RqgQuery>(
  name: Q,
  data: Parameters<CONFIG.Queries[Q]>[0],
  spellName: string,
): Promise<Awaited<ReturnType<CONFIG.Queries[Q]>> | undefined> {
  const gm = game.users?.activeGM;
  if (!hasActiveGm(spellName) || !gm) {
    return undefined;
  }
  const needsGm = localize("RQG.ChatMessage.SpellCast.NeedsActiveGm", { spellName });
  const leaving = gmLeaves(gm);
  try {
    const answer = await Promise.race([
      gm.query(name, data as any).then((value) => ({ value })),
      leaving.left.then(() => undefined),
    ]);
    if (!answer) {
      logger.warn(needsGm);
      return undefined;
    }
    return answer.value as Awaited<ReturnType<CONFIG.Queries[Q]>>;
  } catch (error) {
    logger.warn(needsGm, undefined, error);
    return undefined;
  } finally {
    leaving.stop();
  }
}
