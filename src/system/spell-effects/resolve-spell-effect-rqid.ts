import type { RqidString } from "../api/rqid-api";
import { isValidRqidString } from "../api/rqid-validation";

type SpellLike = { system: { effectRqidLink?: { rqid?: string } | null } };

/** The rqid of a spell's Active Effect template - its explicit effectRqidLink, nothing implied. */
export function resolveSpellEffectRqid(spell: SpellLike): RqidString | undefined {
  const linked = spell.system.effectRqidLink?.rqid;
  return isValidRqidString(linked) ? linked : undefined;
}
