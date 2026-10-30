import { localize } from "../util";
import { getSpeakerCompat } from "../fvtt-type-compat";
import { DamageRoll } from "../../rolls/damage-roll/damage-roll";
import { HitLocationRoll } from "../../rolls/hit-location-roll/hit-location-roll";
import { tokenOfDocument } from "./spell-across";
import type { SpellApplyScope } from "./apply-spell-effect";
import type { DamageResult } from "@actors/rqg-actor.ts";

/**
 * Roll a spell's damage and the hit location it strikes, shown like an attack's, then deal it to
 * the target once the dice have landed. `armorPoints: 0` for damage armor doesn't stop; the
 * location's own armor counts when left out. Run as the GM when the target isn't the user's.
 */
export async function dealSpellDamage(
  scope: SpellApplyScope,
  options: { formula: string; armorPoints?: number },
): Promise<DamageResult> {
  const { spell, targetActor, targetName, cast } = scope;
  const caster = cast.casterUuid ? await fromUuid(cast.casterUuid) : null;
  const casterToken = tokenOfDocument(caster);
  const speaker = getSpeakerCompat({
    token: casterToken ?? undefined,
    actor: casterToken?.actor ?? (caster instanceof Actor ? caster : undefined) ?? undefined,
  });
  const damageRoll = await new DamageRoll(options.formula).evaluate();
  const hitLocationRoll = await new HitLocationRoll(
    "1d20",
    {},
    {
      hitLocationNames: HitLocationRoll.tokenToHitLocationNames(targetActor),
      speaker: speaker,
    },
  ).evaluate();
  const flavorKey =
    options.armorPoints === 0
      ? "RQG.ChatMessage.SpellCast.Damage.StrikesIgnoringArmor"
      : "RQG.ChatMessage.SpellCast.Damage.Strikes";
  // Without content, Foundry shows the rolls the way the attack card does
  const message = (await ChatMessage.create({
    speaker: speaker,
    flavor: localize(flavorKey, { spellName: spell.name ?? "", targetName: targetName }),
    rolls: [damageRoll, hitLocationRoll],
  } as any)) as ChatMessage | undefined;
  await game.dice3d?.waitFor3DAnimationByMessageID(message?.id ?? "");
  return targetActor.damage({
    amount: damageRoll.total,
    location: targetActor.getHitLocationByRoll(hitLocationRoll.total ?? 0),
    ...(options.armorPoints != null ? { armorPoints: options.armorPoints } : {}),
  });
}
