/**
 * Stable error codes for RQG.
 *
 * Append-only. Once a code is assigned it keeps its meaning forever; retired codes are
 * never reused. The code is the stable identity — it appears in bug reports, user
 * notifications, and git history. The semantic key is only a convenience for referencing
 * a code from source: renaming a key is safe, changing or reusing a code is not.
 *
 * The code's prefix is its kind, distinguished by who is expected to act:
 *
 * - `RQG-B00NN` — **bug**: a code invariant was violated; this should not be reachable.
 *   The user sees a generic "please report this" notice with the code. `message` is a
 *   developer string for the console only.
 *
 * - `RQG-W00NN` — **world**: something in the world (misconfigured data, a deleted
 *   reference, a missing selection) is wrong and the GM/user can fix it. `message` is a
 *   `RQG.*` translation key; en.json holds the one English definition. The console gets the
 *   English, the user's notification the active locale.
 *
 * Add an error: take the next free number for the kind, add an entry, and reference it at
 * the throw site as `logger.throw(ERR.<key>, ...)`. For a `world` entry, also add its key to
 * static/i18n/en/uiContent.json.
 */

export type RqgErrorKind = "bug" | "world";

export interface RqgErrorEntry {
  /** RQG-B00NN for a bug, RQG-W00NN for a world error. Stable forever; also encodes `kind`. */
  readonly code: string;
  /**
   * `bug`: a plain English developer sentence — console only, never shown to the user.
   * `world`: a `RQG.*` translation key. Console shows English, the notification the user's locale.
   */
  readonly message: string;
}

/** The kind is entirely determined by the code prefix — no separate field to keep in sync. */
export function kindOf(code: string): RqgErrorKind {
  return code.startsWith("RQG-B") ? "bug" : "world";
}

const REGISTRY = {
  // ============================================================================
  // bug — RQG-B00NN — should not be reachable; developer fixes the code
  // ============================================================================
  improveTargetNotAbility: {
    code: "RQG-B0001",
    message: "Tried to improve an item that is not a skill, passion, or rune",
  },
  improveTargetNotEmbedded: {
    code: "RQG-B0002",
    message: "The item to improve is not embedded on an actor",
  },
  improveWithoutAbilityItem: {
    code: "RQG-B0003",
    message: "The improve dialog was opened without an ability item",
  },
  noRuneToCast: {
    code: "RQG-B0004",
    message: "Submitted the rune magic dialog with no rune selected",
  },
  runeMagicChatBadResult: {
    code: "RQG-B0005",
    message: "Unexpected roll result while building the rune magic chat card",
  },
  noAbilityItemToRoll: {
    code: "RQG-B0006",
    message: "Opened the ability roll dialog without an ability item",
  },
  abilityItemNotEmbedded: {
    code: "RQG-B0007",
    message: "Rolled an ability whose item is not embedded on an actor",
  },
  rollHasNoSuccessLevel: {
    code: "RQG-B0008",
    message: "An evaluated roll did not produce a success level",
  },
  noDefenderResolved: {
    code: "RQG-B0009",
    message: "The defence flow could not resolve a defending token or actor",
  },
  siblingElementMissing: {
    code: "RQG-B0010",
    message: "Expected a sibling DOM element that was not present",
  },

  // ============================================================================
  // world — RQG-W00NN — misconfiguration or a missing reference; GM/user can fix it
  // ============================================================================
  noTokenToAttackWith: {
    code: "RQG-W0001",
    message: "RQG.Dialog.Attack.NoTokenToAttackWith",
  },
  weaponNotEmbedded: {
    code: "RQG-W0002",
    message: "RQG.Dialog.Attack.WeaponNotEmbedded",
  },
  noWeaponToAttackWith: {
    code: "RQG-W0003",
    message: "RQG.Dialog.Attack.NoWeaponToAttackWith",
  },
  weaponHasNoOwner: {
    code: "RQG-W0004",
    message: "RQG.Notification.Error.WeaponHasNoOwner",
  },
  runeMagicHasNoCult: {
    code: "RQG-W0005",
    message: "RQG.Notification.Error.RuneMagicHasNoCult",
  },
  improveCharacteristicNoData: {
    code: "RQG-W0006",
    message: "RQG.Notification.Error.ImproveCharacteristicNoData",
  },
  attackMessageMissing: {
    code: "RQG-W0007",
    message: "RQG.Notification.Error.AttackMessageMissing",
  },
  attackRollMissing: {
    code: "RQG-W0008",
    message: "RQG.Notification.Error.AttackRollMissing",
  },
  resistanceMessageMissing: {
    code: "RQG-W0009",
    message: "RQG.Notification.Error.ResistanceMessageMissing",
  },
  referencedActorMissing: {
    code: "RQG-W0010",
    message: "RQG.Notification.Error.ReferencedActorMissing",
  },
  tokenHasNoActor: {
    code: "RQG-W0011",
    message: "RQG.Notification.Error.TokenHasNoActor",
  },
} as const satisfies Record<string, RqgErrorEntry>;

// Fail loud at module load on a malformed or duplicated registry.
{
  const codes = Object.values(REGISTRY).map((e) => e.code);
  if (new Set(codes).size !== codes.length) {
    throw new Error("RQG error-registry: duplicate code");
  }
  for (const entry of Object.values(REGISTRY)) {
    if (!/^RQG-[BW]\d{4}$/.test(entry.code)) {
      throw new Error(`RQG error-registry: ${entry.code} is not a valid RQG-B/W00NN code`);
    }
    if (kindOf(entry.code) === "world" && !entry.message.startsWith("RQG.")) {
      throw new Error(
        `RQG error-registry: ${entry.code} (world) must use an RQG.* translation key`,
      );
    }
  }
}

/** Reference a stable error at a throw site: `logger.throw(ERR.weaponHasNoOwner, { weaponUuid })`. */
export const ERR = REGISTRY;
