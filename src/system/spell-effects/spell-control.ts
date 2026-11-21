import { localize } from "../util";
import { ownershipGivenFlag } from "../../data-model/shared/rqg-document-flags";
import {
  attachSpellTemplate,
  type SpellApplyScope,
  type SpellEffectApplied,
} from "./apply-spell-effect";
import { holdOwnership } from "./spell-anchor";
import { playersOwning } from "./spell-apply-claims";
import { RqgLogger } from "../logging/rqg-logger";

const logger = new RqgLogger("SpellControl", { notify: false });

/**
 * Attach the spell's effect template to the target and, while that effect lasts, let the caster
 * actor's players own the target, e.g. Command (cult spirit) (RBM p.30, p.91). Each player gets
 * their previous ownership back when it ends. Takes the active GM's client: call it from a
 * behavior's `apply` with `runAsGm`.
 *
 * @public since 6.2.0
 */
export async function giveControl(scope: SpellApplyScope): Promise<SpellEffectApplied | undefined> {
  if (!game.users?.activeGM?.isSelf) {
    logger.warn("giveControl runs on the active GM's client: give its behavior runAsGm");
    ui.notifications?.warn(
      localize("RQG.ChatMessage.SpellCast.QueryFailed", { spellName: scope.spell.name ?? "" }),
    );
    return undefined;
  }
  const caster = scope.cast.caster;
  const casterDocument =
    (caster?.tokenUuid ? await fromUuid(caster.tokenUuid) : null) ??
    (caster?.actorUuid ? await fromUuid(caster.actorUuid) : null);
  const casterActor =
    casterDocument instanceof TokenDocument ? casterDocument.actor : casterDocument;
  const given = playersOwning(casterActor).map((user) => ({
    user: user.id ?? "",
    level: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER as number,
  }));
  const applied = await attachSpellTemplate(
    scope,
    given.length ? { flags: { [ownershipGivenFlag]: given } } : {},
  );
  if (applied?.outcome === "applied" && given.length) {
    const effectUuid = applied.effectUuids[0] ?? "";
    const effect = await fromUuid(effectUuid);
    if (!(effect instanceof ActiveEffect)) {
      logger.warn("Could not find the effect to give control with", undefined, effectUuid);
      return undefined;
    }
    try {
      await holdOwnership(effect);
    } catch (error) {
      // Without ownership the effect would only look applied; leave Apply to be clicked again
      logger.warn("Could not give control of the target", undefined, effectUuid, error);
      await effect.delete().catch(() => undefined);
      return undefined;
    }
  }
  return applied;
}
