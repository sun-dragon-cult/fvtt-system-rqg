import { localize } from "../../system/util";

/**
 * Controls for one property of each entry in an rqg-link-field, declared as children of the field:
 * `<rqg-link-control key="bonus" min="0" step="1" prefix="+" suffix="%" label="…">`.
 * Not a registered element: the field reads these and builds the control in every entry.
 *
 * Attributes:
 * - `key`: the entry property.
 * - `type`: "number" (default) or "checkbox".
 * - `label`: localization key; the text of a checkbox, the accessible name of a number. `{name}`
 *   is the linked document's name.
 * - `min`, `max`, `step`, `prefix`, `suffix`: for a number.
 */
export const rqgLinkControlTag = "rqg-link-control";

/** The control `spec` declares, showing `value`; text instead of an input when not editable. */
export function buildRqgLinkControl(
  spec: Element,
  value: unknown,
  editable: boolean,
  name: string,
): HTMLElement {
  const control = document.createElement("span");
  control.className = "control";
  const key = spec.getAttribute("key") ?? "";
  const labelKey = spec.getAttribute("label");
  const label = labelKey ? localize(labelKey, { name }) : "";

  if (spec.getAttribute("type") === "checkbox") {
    const wrapper = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.dataset["key"] = key;
    checkbox.checked = Boolean(value);
    checkbox.disabled = !editable;
    wrapper.append(checkbox, label);
    control.append(wrapper);
    return control;
  }

  const prefix = spec.getAttribute("prefix") ?? "";
  const suffix = spec.getAttribute("suffix") ?? "";
  if (!editable) {
    control.textContent = `${prefix}${value == null ? 0 : String(value)}${suffix}`;
    return control;
  }
  const input = document.createElement("input");
  input.type = "number";
  for (const attribute of ["min", "max", "step"]) {
    const limit = spec.getAttribute(attribute);
    if (limit != null) {
      input.setAttribute(attribute, limit);
    }
  }
  input.dataset["key"] = key;
  input.value = value == null ? "" : String(value);
  input.ariaLabel = label;
  control.append(prefix, input, suffix);
  return control;
}
