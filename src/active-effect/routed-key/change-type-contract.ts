/**
 * Which `change.type` values a routed change can be applied with (#920).
 *
 * Separate from the pad mode contract in field-mode-contract.ts: that answers "is this mode
 * meaningful against this path", this answers "can core dispatch this type to a DataField at all".
 */

/**
 * The types core implements as a `DataField#applyChange` branch - everything in
 * `CONST.ACTIVE_EFFECT_CHANGE_TYPES` except `custom`, plus `subtract`, which the global
 * `ActiveEffectChangeType` excludes.
 *
 * A `Record` keyed on that global type, so a type added to core's list is a compile error here
 * rather than a silent omission: a new native type needs a deliberate judgement about what it means
 * against a pad. The values are runtime literals because `CONST` is a Foundry global.
 */
const NATIVE_CHANGE_TYPES: Record<Exclude<ActiveEffectChangeType, "custom"> | "subtract", true> = {
  add: true,
  subtract: true,
  multiply: true,
  override: true,
  upgrade: true,
  downgrade: true,
};

/**
 * True when core can apply `changeType` to a DataField on its own. Anything else falls through to
 * `DataField#_applyChangeCustom`, which returns `undefined` - and `applyChange` then cleans that to
 * the field's `initial` and writes it, so an unsupported type wipes the target rather than no-opping.
 */
export function isNativeChangeType(changeType: string): boolean {
  return Object.hasOwn(NATIVE_CHANGE_TYPES, changeType);
}
