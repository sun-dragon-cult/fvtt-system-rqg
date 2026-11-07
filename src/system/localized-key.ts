/**
 * Fields that offer a list of known values but also accept custom text store the key of a known
 * value (e.g. "Loyalty") and the typed text of a custom one. These helpers convert between the
 * stored value and the label shown in the current language.
 */
import { localize } from "./util";
import { localizeEnglish } from "./localize-english";

/** The label to show for a stored value: the localized label of a known key, otherwise the value. */
export function toLabel(value: string, prefix: string, keys: readonly string[]): string {
  return keys.includes(value) ? localize(`${prefix}${value}`) : value;
}

/**
 * The value to store for typed or picked text: the key when the text is a key or the label of one,
 * in the current language or in English, otherwise the trimmed text.
 */
export function toKey(value: string, prefix: string, keys: readonly string[]): string {
  const text = value.trim();
  if (!text || keys.includes(text) || !game.i18n) {
    return text;
  }
  const wanted = text.toLocaleLowerCase();
  const matches = (label: string) => label.trim().toLocaleLowerCase() === wanted;
  return (
    keys.find((key) => matches(game.i18n!.localize(`${prefix}${key}`))) ??
    keys.find((key) => matches(localizeEnglish(`${prefix}${key}`))) ??
    text
  );
}
