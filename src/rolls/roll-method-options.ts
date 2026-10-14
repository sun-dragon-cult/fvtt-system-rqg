import type { Modifier } from "./ability-roll/ability-roll.types";
import { warnDeprecated } from "../system/deprecation";

/** Options shared by the public roll methods on actors and items - part of the public API. */
export type RollMethodOptions = {
  /** Roll at once without opening the roll dialog; the roll is then returned. */
  skipDialog?: boolean;
  /** The token that rolls, for the chat speaker. Defaults to the actor's token. */
  token?: TokenDocument | null;
  /** Extra modifiers. The ability dialog lists them; the characteristic dialog doesn't take them yet. */
  modifiers?: Modifier[];
  rollMode?: foundry.dice.Roll.Mode;
};

/** Options for `item.cast` and `actor.castSpell` - part of the public API. */
export type SpellCastOptions = RollMethodOptions & {
  /** Points to cast with, defaults to the spell's points. */
  levelUsed?: number;
  /** Extra magic points spent to boost the spell. */
  magicPointBoost?: number;
  /** Where magic points are drawn from; defaults to drawing stored sources first. */
  magicPointSource?: string;
  /** Rune magic: where rune points are drawn from; defaults to the caster's own cult. */
  runePointSource?: string;
  /** Rune magic: the id of the rune item to roll; defaults to the strongest eligible rune. */
  usedRuneId?: string;
};

export function warnDeprecatedRollMethod(oldCall: string, newCall: string): void {
  warnDeprecated(oldCall, newCall, { since: "6.2.0", until: "6.4.0" });
}
