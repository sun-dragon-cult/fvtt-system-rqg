import type { PreparedRoll } from "../../rolls/roll-preparation";
import { toSignedString } from "../../system/util";

/** The footer lines for what the `rqg.prepare…` hooks added, and why the roll isn't allowed. */
export function preparedRollHtml(prepared: PreparedRoll | undefined): string {
  const escape = (text: unknown) => foundry.utils.escapeHTML(String(text ?? ""));
  const modifiers = (prepared?.modifiers ?? [])
    .filter((modifier) => Number(modifier.value) !== 0)
    .map(
      (modifier) =>
        `<div class="prepared-modifier">${escape(toSignedString(Number(modifier.value)))}% ${escape(modifier.description)}</div>`,
    );
  const forbidden = prepared?.forbidden
    ? [`<div class="prepared-forbidden" role="alert">${escape(prepared.forbidden)}</div>`]
    : [];
  return [...modifiers, ...forbidden].join("");
}

/**
 * Show a prepared roll in a rendered dialog without re-rendering it, and disable the roll buttons
 * while it's forbidden. Buttons disabled for other reasons stay disabled.
 */
export function showPreparedRoll(
  root: HTMLElement,
  prepared: PreparedRoll | undefined,
  rollButtonSelector: string,
): void {
  const container = root.querySelector<HTMLElement>("[data-prepared-roll]");
  if (container) {
    container.innerHTML = preparedRollHtml(prepared);
  }
  for (const button of root.querySelectorAll<HTMLButtonElement>(rollButtonSelector)) {
    if (prepared?.forbidden) {
      if (!button.disabled) {
        button.disabled = true;
        button.dataset["forbidden"] = "";
      }
    } else if (button.dataset["forbidden"] !== undefined) {
      button.disabled = false;
      delete button.dataset["forbidden"];
    }
  }
}

/** The prepared modifiers as chance breakdown tooltip lines. */
export function preparedBreakdown(
  prepared: PreparedRoll | undefined,
): Array<{ label: string; value: number }> {
  return (prepared?.modifiers ?? []).map((modifier) => ({
    label: modifier.description,
    value: Number(modifier.value) || 0,
  }));
}
