/**
 * A system specific Error that can encapsulate extra debugging information (in `debugData`).
 *
 * Extends the real `Error` (not just `implements Error`) so `instanceof Error`,
 * `.toString()`, and `.stack` all behave normally wherever a caught error is handled
 * generically — including Foundry's own `ApplicationV2#_onSubmitForm`, which catches a thrown
 * error and passes it as-is to `ui.notifications.error()` for stringification.
 */
export class RqgError extends Error {
  public debugData: any[];
  /** Stable RQG-NNNN code, set when thrown via a registry entry (see error-registry.ts). */
  public code?: string;
  /** Best-effort caller location (`Fn (file:line:col)`), set by RqgLogger for coded errors. */
  public site?: string;

  constructor(message: string, ...debugData: any[]) {
    super(message);
    this.name = "RqgError";
    this.debugData = debugData;
  }
}
