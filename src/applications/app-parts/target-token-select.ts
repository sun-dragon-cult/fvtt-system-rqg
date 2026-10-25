import { getTargetedTokenNames, isFoundryElementInstanceOf, localize } from "../../system/util";
import { metersPerSceneUnit } from "../../system/spell-effects/scene-distance";

/** The option standing for several targets at once, which can't be picked again once left. */
export const SEVERAL_TARGETS = "several";

type TargetCandidate = { id: string; name: string; x: number; y: number };

/**
 * Options for picking one target: none, the acting token itself, then every other candidate,
 * nearest first, labeled with its distance in meters.
 */
export function targetTokenOptions(
  candidates: TargetCandidate[],
  self: TargetCandidate | undefined,
  metersPerPixel: number,
): SelectOptionData<string>[] {
  const others = candidates
    .filter((c) => c.id !== self?.id)
    .map((c) => ({
      candidate: c,
      meters: self
        ? Math.round(Math.hypot(c.x - self.x, c.y - self.y) * metersPerPixel)
        : undefined,
    }))
    .sort(
      (a, b) =>
        (a.meters ?? 0) - (b.meters ?? 0) || a.candidate.name.localeCompare(b.candidate.name),
    );
  return [
    { value: "", label: localize("RQG.Dialog.Common.NoTarget") },
    ...(self
      ? [{ value: self.id, label: localize("RQG.Dialog.Common.TargetSelf", { name: self.name }) }]
      : []),
    ...others.map(({ candidate, meters }) => ({
      value: candidate.id,
      label:
        meters == null
          ? candidate.name
          : localize("RQG.Dialog.Common.TargetAtDistance", {
              name: candidate.name,
              meters: String(meters),
            }),
    })),
  ];
}

/** Which option stands for the user's current targets. */
export function selectedTargetValue(targetIds: string[]): string {
  if (targetIds.length > 1) {
    return SEVERAL_TARGETS;
  }
  return targetIds[0] ?? "";
}

/**
 * The target picker for this user on the viewed scene: the tokens they can see, measured from
 * `from`, with the current targets selected.
 */
export function buildTargetTokenSelect(from: foundry.canvas.placeables.Token | undefined): {
  options: SelectOptionData<string>[];
  selected: string;
} {
  const grid = canvas?.scene?.grid;
  const toCandidate = (token: foundry.canvas.placeables.Token): TargetCandidate => ({
    id: token.id ?? "",
    name: token.document.name ?? "",
    x: token.center.x,
    y: token.center.y,
  });
  const candidates = (canvas?.tokens?.placeables ?? []).filter((t) => t.visible).map(toCandidate);
  const metersPerPixel = grid ? (grid.distance * metersPerSceneUnit(grid.units)) / grid.size : 0;
  const options = targetTokenOptions(candidates, from && toCandidate(from), metersPerPixel);

  const targetIds = [...(game.user?.targets ?? [])].map((t) => t.id ?? "");
  const selected = selectedTargetValue(targetIds);
  if (selected === SEVERAL_TARGETS) {
    options.unshift({ value: SEVERAL_TARGETS, label: getTargetedTokenNames() });
  } else if (selected && !options.some((o) => o.value === selected)) {
    const target = game.user?.targets.first();
    options.push({ value: selected, label: target?.document.name ?? selected });
  }
  return { options, selected };
}

/** Make the picked option this user's only target, or clear the targets for none. */
export function setUserTargetFromSelect(value: string): void {
  if (value === SEVERAL_TARGETS) {
    return;
  }
  canvas?.tokens?.setTargets(value ? [value] : [], { mode: "replace" });
}

/** Keep a rendered target picker in step with the user's targets, without a re-render. */
export function applyTargetTokenSelect(
  element: HTMLElement,
  targetSelect: { options: SelectOptionData<string>[]; selected: string },
): void {
  const select = element.querySelector<HTMLSelectElement>("select[data-target-select]");
  if (!select) {
    return;
  }
  select.replaceChildren(
    ...targetSelect.options.map((o) => {
      const option = document.createElement("option");
      option.value = o.value;
      option.textContent = o.label;
      option.selected = o.value === targetSelect.selected;
      return option;
    }),
  );
}

/** Retarget from a changed target picker; false when the change was the picker's, true otherwise. */
export function onTargetTokenSelectChange(event: Event): boolean {
  const select = event.target;
  if (
    !isFoundryElementInstanceOf(select, HTMLSelectElement) ||
    !select.matches("[data-target-select]")
  ) {
    return true;
  }
  setUserTargetFromSelect(select.value);
  return false;
}
