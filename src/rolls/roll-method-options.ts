import type { Modifier } from "./ability-roll/ability-roll.types";

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

/** Warn once that an old roll method is used; they are removed in 6.4.0. */
export function warnDeprecatedRollMethod(oldCall: string, newCall: string): void {
  foundry.utils.logCompatibilityWarning(`RQG | ${oldCall} is deprecated, use ${newCall}.`, {
    since: "RQG 6.2.0",
    until: "RQG 6.4.0",
    once: true,
  });
}
