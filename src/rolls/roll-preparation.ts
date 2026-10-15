import type { Modifier } from "./ability-roll/ability-roll.types";

/** What the `rqg.prepare…` hooks can say about a roll besides its modifiers - part of the public API. */
export type RollPreparation = {
  /** Why the roll isn't allowed. The dialog shows it and can't roll, and the roll is refused. */
  forbidden?: string;
};

/** What a roll dialog shows from the `rqg.prepare…` hooks. */
export type PreparedRoll = {
  /** The modifiers the hooks added. */
  modifiers: Modifier[];
  forbidden?: string;
};

/** Warn with the reason when a `rqg.prepare…` hook forbade the roll. */
export function isForbidden(preparation: RollPreparation): boolean {
  if (!preparation.forbidden) {
    return false;
  }
  ui.notifications?.warn(preparation.forbidden);
  return true;
}

/** What the hooks added to `modifiers`, past the `ownCount` modifiers the dialog passed in. */
export function preparedRoll(
  modifiers: Modifier[] | undefined,
  ownCount: number,
  preparation: RollPreparation,
): PreparedRoll {
  return { modifiers: (modifiers ?? []).slice(ownCount), forbidden: preparation.forbidden };
}

export function preparedModifierTotal(prepared: PreparedRoll | undefined): number {
  return (prepared?.modifiers ?? []).reduce(
    (sum, modifier) => sum + (Number(modifier.value) || 0),
    0,
  );
}
