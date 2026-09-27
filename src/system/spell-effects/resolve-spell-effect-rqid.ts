import type { RqidString } from "../api/rqid-api";
import { isValidRqidString } from "../api/rqid-validation";

type SpellLike = {
  system: { effectRqidLink?: { rqid?: string } | null };
  flags?: { rqg?: { documentRqidFlags?: { id?: string } } };
};

/**
 * The rqid of a spell's Active Effect template: its effectRqidLink when set, otherwise named after
 * the spell - `i.spirit-magic.bladesharp` → `ae..bladesharp`, like its `je..bladesharp` description.
 */
export function resolveSpellEffectRqid(spell: SpellLike): RqidString | undefined {
  const linked = spell.system.effectRqidLink?.rqid;
  if (isValidRqidString(linked)) {
    return linked;
  }
  const slug = spell.flags?.rqg?.documentRqidFlags?.id?.split(".")[2];
  const derived = slug ? `ae..${slug}` : undefined;
  return isValidRqidString(derived) ? derived : undefined;
}
