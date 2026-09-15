/**
 * General-purpose logging for the RQG system.
 *
 * Provides namespaced console output and optional UI notifications.
 * Can be extended for specific system components (migrations, combat, etc).
 *
 * The `notify` option defaults to `true` except for throw — opt out explicitly
 * with `{ notify: false }` when a notification is not appropriate.
 */

import { RqgError } from "../rqg-error";
import { kindOf, type RqgErrorEntry, type RqgErrorKind } from "../error-registry";

/**
 * The English string for a translation key, regardless of the active locale — for console
 * and log output, which stays English. Foundry loads `en` into `_fallback` when the active
 * locale is not English, and into `translations` when it is. A non-key string is returned
 * unchanged.
 */
function localizeEnglish(keyOrText: string): string {
  const i18n = game.i18n as unknown as {
    _fallback?: object;
    translations?: object;
  };
  const en =
    foundry.utils.getProperty(i18n?._fallback ?? {}, keyOrText) ??
    foundry.utils.getProperty(i18n?.translations ?? {}, keyOrText);
  return typeof en === "string" ? en : keyOrText;
}

const FRAME_FILE = /([^\s(/\\]+):\d+:\d+\)?\s*$/;
const FRAME_FUNCTION = /\bat\s+(?:async\s+|new\s+)?([\w.$<>]+)\s*[(@]/;

/**
 * Best-effort `Fn (file.ts)` of the caller of `method` (the RqgLogger method actually invoked,
 * e.g. `this.throw` / `this.error`) — so a coded error logged from several places can be traced
 * back near its origin. `Error.captureStackTrace(marker, method)` excludes `method` itself and
 * everything above it; since `method` is looked up via `this` it's whichever override is really
 * executing (e.g. a subclass's), so this needs no list of logger classes or files to skip and
 * stays correct for any future subclass.
 *
 * Deliberately excludes line/column: there is no JS API to resolve a sourcemap at runtime, so a
 * raw `Error.stack` position is only ever accurate against the actually-*executing* script — Vite's
 * type-stripped dev output, or a minified prod chunk — never the original `.ts` source shown in
 * an editor. The function name (kept by `keepNames` even in prod) and the file segment are stable
 * in both. A thrown error's real, correctly source-mapped location is already one click away by
 * expanding the browser's own uncaught-exception stack trace — this exists for `error()` instead,
 * which produces no exception for the browser to resolve.
 */
function callerSite(method: (...args: never[]) => unknown): string | undefined {
  if (!Error.captureStackTrace) {
    return undefined;
  }
  const marker: { stack?: string } = {};
  Error.captureStackTrace(marker, method);
  for (const line of marker.stack?.split("\n") ?? []) {
    const file = line.match(FRAME_FILE)?.[1];
    if (!file) {
      continue;
    }
    const fn = line.match(FRAME_FUNCTION)?.[1];
    return fn ? `${fn} (${file})` : file;
  }
  return undefined;
}

export interface LogOptions {
  /**
   * Whether to show a UI notification to the user (default: true).
   * Set to false to suppress notifications (e.g. during batch operations).
   */
  notify?: boolean;
}

export interface RqgTimingHandle {
  timeEnd(): void;
}

/**
 * Core logger with namespace support.
 *
 * Usage:
 * ```typescript
 * const logger = new RqgLogger("Combat");
 * logger.info("Attack resolved");
 * logger.warn("Skill not found");                    // console + ui notification
 * logger.warn("Batch issue", { notify: false });     // console only
 * logger.error(ERR.runeMagicChatBadResult);        // coded, non-fatal: log + continue (see below)
 * logger.throw(ERR.rollHasNoSuccessLevel, data);   // coded, fatal: log + throws
 * logger.throw("ad-hoc message", data);            // uncoded: console + verbatim notification + throws
 * ```
 *
 * `error` and `throw` both accept a registry entry (`ERR.someError`). They share the same
 * resolution — the console line and `RqgError#message` stay English, the user notification
 * is the active locale, and the entry's `kind` picks what the user reads:
 * - `bug`   — user notification: generic "please report this" (only on `throw`; `error` stays
 *   silent to the user, since the code recovered).
 * - `world` — user notification: the localized guidance string. `throw` shows it as an error,
 *   `error` as a warning ("handled, but check your data").
 * Both append ` (RQG-x00NN)` to the notification, and the console line ends with the caller's
 * `Fn (file:line:col)` so a code used in several places can be traced to the exact path
 * (also stored on `RqgError#site`).
 */
export class RqgLogger {
  constructor(
    protected namespace: string,
    private readonly defaultOptions: LogOptions = {},
  ) {}

  private formatMessage(message: string): string {
    return `RQG | ${this.namespace} | ${message}`;
  }

  private shouldNotify(options?: LogOptions): boolean {
    return options?.notify ?? this.defaultOptions.notify ?? true;
  }

  info(message: string, options?: LogOptions, ...debugData: unknown[]): void {
    console.log(this.formatMessage(message), ...debugData);
    if (this.shouldNotify(options)) {
      ui.notifications?.info(message, { console: false });
    }
  }

  warn(message: string, options?: LogOptions, ...debugData: unknown[]): void {
    console.warn(this.formatMessage(message), ...debugData);
    if (this.shouldNotify(options)) {
      ui.notifications?.warn(message, { console: false });
    }
  }

  /**
   * Resolve a registry entry (or bare string) into the English console text and the
   * locale-specific user text. Shared by `error` and `throw`. Note: for a `bug` entry,
   * `userMessage` is just the console text — the actual "please report this" wrapper the
   * user sees is assembled by `throw` (the only caller that shows it), so it isn't localized
   * here on every call, including the ones that never surface it (`error`'s bug branch).
   */
  private resolveError(error: RqgErrorEntry | string): {
    code: string | undefined;
    kind: RqgErrorKind | undefined;
    consoleMessage: string;
    userMessage: string;
  } {
    if (typeof error === "string") {
      return { code: undefined, kind: undefined, consoleMessage: error, userMessage: error };
    }
    const kind = kindOf(error.code);
    const consoleMessage = kind === "world" ? localizeEnglish(error.message) : error.message;
    const userMessage =
      kind === "world" ? (game.i18n?.localize(error.message) ?? consoleMessage) : consoleMessage;
    return { code: error.code, kind, consoleMessage, userMessage };
  }

  private static formatCoded(code: string | undefined, message: string, site: string | undefined) {
    return (code ? `${code} | ${message}` : message) + (site ? ` | ${site}` : "");
  }

  /**
   * The bare-string `error()` policy: console + a UI error notification unless
   * `{ notify: false }`. A subclass (e.g. MigrationLogger) overrides this — not `error` itself
   * — to add side effects for the plain-string case, without needing to know about coded
   * `RqgErrorEntry` calls or having its own `error` signature drift when `error`'s does.
   */
  protected reportStringError(
    message: string,
    options: LogOptions | undefined,
    debugData: unknown[],
  ): void {
    console.error(this.formatMessage(message), ...debugData);
    if (this.shouldNotify(options)) {
      ui.notifications?.error(message, { console: false });
    }
  }

  /**
   * Log an error and continue. Pass a bare string for an ad-hoc error (unchanged behaviour:
   * console + a UI error notification unless `{ notify: false }`), or a registry entry
   * (`ERR.someError`) for a coded, recoverable failure — the caller must have a fallback.
   * A coded `bug` stays silent to the user (the code recovered); a coded `world` shows a
   * warning notification so the GM can fix their data.
   */
  error(entry: RqgErrorEntry, ...debugData: unknown[]): void;
  error(message: string, options?: LogOptions, ...debugData: unknown[]): void;
  error(errorOrMessage: RqgErrorEntry | string, ...rest: unknown[]): void {
    if (typeof errorOrMessage === "string") {
      this.reportStringError(errorOrMessage, rest[0] as LogOptions | undefined, rest.slice(1));
      return;
    }

    const { code, kind, consoleMessage, userMessage } = this.resolveError(errorOrMessage);
    const site = callerSite(this.error);
    console.error(this.formatMessage(RqgLogger.formatCoded(code, consoleMessage, site)), ...rest);
    if (kind === "world") {
      ui.notifications?.warn(`${userMessage} (${code})`, { console: false });
    }
  }

  /**
   * Log an error, notify the user, and throw an RqgError. Use for a failure the current
   * operation cannot recover from. Pass a registry entry (`ERR.someError`) to attach a stable
   * code; a bare string is shown verbatim. See the class doc for how `kind` shapes the
   * notification. The console line and `RqgError#message` are always English.
   */
  throw(error: RqgErrorEntry | string, ...debugData: unknown[]): never {
    const { code, kind, consoleMessage, userMessage } = this.resolveError(error);
    const site = callerSite(this.throw);
    const notifyMessage =
      kind === "bug"
        ? (game.i18n?.localize("RQG.Notification.Error.Unexpected") ?? userMessage)
        : userMessage;

    console.error(
      this.formatMessage(RqgLogger.formatCoded(code, consoleMessage, site)),
      ...debugData,
    );
    ui.notifications?.error(code ? `${notifyMessage} (${code})` : notifyMessage, {
      console: false,
    });

    const rqgError = new RqgError(consoleMessage, ...debugData);
    rqgError.code = code;
    rqgError.site = site;
    throw rqgError;
  }

  /**
   * Start a timer with namespaced formatting.
   * The label will be logged with the ⏱ emoji and namespace prefix.
   * Returns a timing handle so callers can avoid repeating the timer label.
   */
  time(label: string): RqgTimingHandle {
    const timerLabel = this.formatMessage(`⏱ ${label}`);
    console.time(timerLabel);
    return {
      timeEnd: () => {
        console.timeEnd(timerLabel);
      },
    };
  }

  /**
   * End a timer started with time().
   * Accepts either a matching label string or a timing handle returned by time().
   */
  timeEnd(labelOrHandle: string | RqgTimingHandle): void {
    if (typeof labelOrHandle !== "string") {
      labelOrHandle.timeEnd();
      return;
    }
    console.timeEnd(this.formatMessage(`⏱ ${labelOrHandle}`));
  }
}
