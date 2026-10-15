import type { AbilityRollOptions, Modifier } from "./ability-roll/ability-roll.types";
import type { RqgActor } from "@actors/rqg-actor.ts";
import type { CombatManeuver, UsageType, WeaponItem } from "@item-model/weapon-data-model.ts";
import type { DefenceType } from "../applications/attack-flow/defence-dialog-data.types";
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

/** Options for `weapon.attack` - part of the public API. */
export type AttackOptions = {
  /** How the weapon is used; preselected in the attack dialog and remembered on the weapon. */
  usage?: UsageType;
};

/** What the `rqg.preAttack` and `rqg.attack` hooks get with the weapon - part of the public API. */
export type AttackHookData = {
  attacker: RqgActor;
  usage: UsageType;
  combatManeuver: CombatManeuver;
  /** The missile fired, or the weapon itself when it is thrown. Read only. */
  readonly projectile: WeaponItem | undefined;
  /** The attack roll's options; it is rolled later, when the defender defends. */
  rollOptions: AbilityRollOptions;
};

/** What the `rqg.preDefence` and `rqg.defence` hooks get with the defender - part of the public API. */
export type DefenceHookData = {
  attacker: RqgActor | undefined;
  /** The attack card being defended against. */
  attackChatMessage: ChatMessage;
  /**
   * How the defender defends. A pre hook can only change it to "ignore", to forbid the defence
   * (the attack then resolves as undefended); other changes are undone.
   */
  defence: DefenceType;
  parryingWeapon: WeaponItem | undefined;
  parryingWeaponUsage: UsageType | undefined;
  /** The defence roll's options; `naturalSkill` is the defence skill's chance. */
  rollOptions: AbilityRollOptions;
  /** Shown on the attack card, e.g. why a parry wasn't allowed. */
  notes: string[];
};

export function warnDeprecatedRollMethod(oldCall: string, newCall: string): void {
  warnDeprecated(oldCall, newCall, { since: "6.2.0", until: "6.4.0" });
}
