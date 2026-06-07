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
 * logger.throw("Expected actor to exist", actor);   // console + ui notification + throws
 * ```
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

  error(message: string, options?: LogOptions, ...debugData: unknown[]): void {
    console.error(this.formatMessage(message), ...debugData);
    if (this.shouldNotify(options)) {
      ui.notifications?.error(message, { console: false });
    }
  }

  /**
   * Log an error, notify the user, and throw an RqgError.
   * Replaces the common pattern of `ui.notifications?.error(msg); throw new RqgError(msg, data)`.
   */
  throw(message: string, ...debugData: unknown[]): never {
    console.error(this.formatMessage(message), ...debugData);
    ui.notifications?.error(message, { console: false });
    throw new RqgError(message, ...debugData);
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
