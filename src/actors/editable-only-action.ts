/** Make a sheet action a no-op while the sheet is not editable (not an owner, or a locked pack). */
export function editableOnlyAction<This extends { isEditable: boolean }, Args extends unknown[], R>(
  handler: (this: This, ...args: Args) => R,
): (this: This, ...args: Args) => R | undefined {
  return function (this: This, ...args: Args): R | undefined {
    if (!this.isEditable) {
      return undefined;
    }
    return handler.apply(this, args);
  };
}
