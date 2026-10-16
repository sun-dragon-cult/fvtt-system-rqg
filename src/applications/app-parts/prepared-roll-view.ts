import type { PreparedRoll } from "../../rolls/roll-preparation";

const escape = (text: unknown) => foundry.utils.escapeHTML(String(text ?? ""));

/** Modifier rows for a dialog's key-value grid, for what the `rqg.prepare…` hooks added. */
export function preparedModifiersHtml(prepared: PreparedRoll | undefined): string {
  return (prepared?.modifiers ?? [])
    .filter((modifier) => Number(modifier.value) !== 0)
    .map(
      (modifier) =>
        `<label>${escape(modifier.description)}</label>` +
        `<div><input type="number" value="${Number(modifier.value)}" readonly tabindex="-1"> %</div>`,
    )
    .join("");
}

/** The footer line saying why a `rqg.prepare…` hook forbade the roll. */
export function preparedForbiddenHtml(prepared: PreparedRoll | undefined): string {
  return prepared?.forbidden
    ? `<div class="prepared-forbidden" role="alert">${escape(prepared.forbidden)}</div>`
    : "";
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
  const modifiers = root.querySelector<HTMLElement>("[data-prepared-modifiers]");
  if (modifiers) {
    modifiers.innerHTML = preparedModifiersHtml(prepared);
  }
  const forbidden = root.querySelector<HTMLElement>("[data-prepared-forbidden]");
  if (forbidden) {
    forbidden.innerHTML = preparedForbiddenHtml(prepared);
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
