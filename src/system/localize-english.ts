/**
 * The English string for a translation key, regardless of the active locale. Foundry loads `en`
 * into `_fallback` when the active locale is not English, and into `translations` when it is.
 * A non-key string is returned unchanged.
 */
export function localizeEnglish(keyOrText: string): string {
  const i18n = game.i18n as unknown as {
    _fallback?: object;
    translations?: object;
  };
  const en =
    foundry.utils.getProperty(i18n?._fallback ?? {}, keyOrText) ??
    foundry.utils.getProperty(i18n?.translations ?? {}, keyOrText);
  return typeof en === "string" ? en : keyOrText;
}
