import { isFoundryElementInstanceOf } from "../../system/util";

export type ImproveDialogHeaderData = {
  name: string;
  typeLocName: string;
  currentValueDisplay: string;
  imageSrc?: string | null;
  chipText?: string;
  chipClass?: string;
};

export type ImproveDialogButton = {
  type: "button" | "submit";
  action?: "cancel";
  icon: string;
  label: string;
};

export type ImproveDialogSourceState<TSource extends string> = {
  selectedSource: TSource | null;
  showSourceChooser: boolean;
};

export function buildImproveDialogButtons(
  canSubmit: boolean,
  submitLabel: string,
  cancelLabel: string,
): ImproveDialogButton[] {
  return [
    ...(canSubmit
      ? [
          {
            type: "submit" as const,
            icon: "fa-solid fa-check",
            label: submitLabel,
          },
        ]
      : []),
    {
      type: "button",
      action: "cancel",
      icon: "fa-solid fa-times",
      label: cancelLabel,
    },
  ];
}

export function buildImproveDialogSourceState<TSource extends string>(
  selectedSource: TSource | null,
  shownSourceFlags: readonly boolean[],
): ImproveDialogSourceState<TSource> {
  const shownSourceCount = shownSourceFlags.filter(Boolean).length;
  return {
    selectedSource,
    showSourceChooser: shownSourceCount > 1,
  };
}

export function syncImprovementSelectionUi(
  element: HTMLElement,
  selectedSource: string | null,
): void {
  for (const option of element.querySelectorAll<HTMLElement>("[data-source-option]")) {
    option.classList.toggle("active", option.dataset["sourceOption"] === selectedSource);
  }

  for (const panel of element.querySelectorAll<HTMLElement>("[data-source-panel]")) {
    const isSelected = panel.dataset["sourcePanel"] === selectedSource;
    panel.hidden = !isSelected;

    for (const input of panel.querySelectorAll<HTMLInputElement>(
      'input[name="experiencegaintype"]',
    )) {
      input.disabled = !isSelected;
    }

    if (!isSelected) {
      continue;
    }

    let checked = panel.querySelector<HTMLInputElement>('input[name="experiencegaintype"]:checked');
    if (!checked) {
      checked =
        panel.querySelector<HTMLInputElement>(
          'input[name="experiencegaintype"][data-default-method]',
        ) ?? panel.querySelector<HTMLInputElement>('input[name="experiencegaintype"]');
      if (checked) {
        checked.checked = true;
      }
    }
  }
}

export function getSelectedImprovementSourceFromForm<TSource extends string>(
  element: HTMLElement,
  allowedSources: readonly TSource[],
  fallback: TSource | null,
): TSource | null {
  const selected = element.querySelector<HTMLInputElement>(
    'input[name="improvementSource"]:checked',
  );
  const selectedValue = selected?.value;

  if (!selectedValue) {
    return fallback;
  }

  if ((allowedSources as readonly string[]).includes(selectedValue)) {
    return selectedValue as TSource;
  }

  return fallback;
}

export function isImprovementSelectionChangeEvent(event: Event): boolean {
  const target = event.target;
  if (!target || typeof target !== "object") {
    return false;
  }

  if (!isFoundryElementInstanceOf(target, "input")) {
    return false;
  }

  const maybeInput = target as {
    nodeName?: string;
    name?: string;
    getAttribute?: (name: string) => string | null;
  };

  const name =
    typeof maybeInput.name === "string"
      ? maybeInput.name
      : (maybeInput.getAttribute?.("name") ?? "");
  return name === "improvementSource" || name === "experiencegaintype";
}
