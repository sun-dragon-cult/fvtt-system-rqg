/** An RQG version, e.g. "6.4.0". */
export type RqgVersion = `${number}.${number}.${number}`;

/**
 * Log Foundry's compatibility warning, once per caller, that `oldCall` is deprecated. Every RQG
 * deprecation goes through here with literal versions, so the release check
 * (`buildScripts/check-deprecations.ts`) finds those due for removal.
 */
export function warnDeprecated(
  oldCall: string,
  newCall: string,
  { since, until }: { since: RqgVersion; until: RqgVersion },
): void {
  foundry.utils.logCompatibilityWarning(`RQG | ${oldCall} is deprecated, use ${newCall}.`, {
    since: `RQG ${since}`,
    until: `RQG ${until}`,
    once: true,
  });
}
