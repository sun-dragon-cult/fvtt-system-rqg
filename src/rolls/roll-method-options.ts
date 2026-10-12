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

export function warnDeprecatedRollMethod(oldCall: string, newCall: string): void {
  warnDeprecated(oldCall, newCall, { since: "6.2.0", until: "6.4.0" });
}
