import { ItemTypeEnum } from "@item-model/item-types.ts";
import type { HitLocationItem } from "@item-model/hit-location-data-model.ts";
import type { RqgActor } from "@actors/rqg-actor.ts";
import { ActorTypeEnum, type CharacterActor } from "../../data-model/actor-data/rqg-actor-data.ts";
import { assertDocumentSubType, isDocumentSubType, localize } from "../../system/util";
import { systemId } from "../../system/config";
import { templatePaths } from "../../system/load-handlebars-templates";
import type { RqgDotPickerElement } from "../../applications/dot-picker/dot-picker-element";
import { distributeHealing } from "./hit-location-healing-calculations";

/** A wound picked to heal. */
export type WoundChoice = { location: HitLocationItem; wound: number; points: number };

/** What `chooseWounds` resolves to: the wounds to heal and the severed locations to reattach. */
export type ChosenHealing = { wounds: WoundChoice[]; reattach: HitLocationItem[] };

/**
 * What `chooseWounds` asks for - part of the public API. `single`: one wound gets all `points`.
 * `split`: the points are spread over wounds, worst first by default. `location`: all points go to
 * one location, the clicked wound first and the rest to its other wounds.
 */
export type ChooseWoundsOptions = {
  title: string;
  points: number;
  mode: "single" | "split" | "location";
  /**
   * Offer a "Reattach" checkbox on each severed location. One reattach per cast: in `split` mode
   * ticking one unticks the others, in `location` mode only the healed location's counts.
   */
  offerReattach?: boolean;
};

type HealDialogMode = "free" | ChooseWoundsOptions["mode"];

type HealSubmitResult = {
  hasRemainingWounds: boolean;
  healAllWounds: boolean;
  woundRemoved: boolean;
  woundReduced: boolean;
};

/** What the sheet's heal dialog keeps across rerenders. */
type SheetDialogState = {
  healAll: boolean;
  healPoints: number;
  selectedKey: string | undefined;
  reattachIds: string[];
  healFeedback: string;
};

const HEAL_WOUND_ANIMATION_FALLBACK_MS = 1120;

/** DialogV2 cleans string content, which would drop the custom dot picker elements. */
function dialogContent(html: string): HTMLDivElement {
  const content = document.createElement("div");
  content.innerHTML = html;
  return content;
}

function woundKey(location: HitLocationItem, wound: number): string {
  return `${location.id}:${wound}`;
}

/** The location and wound a key names, if that wound still exists. */
function parseWoundKey(
  actor: RqgActor,
  key: string | undefined,
): { location: HitLocationItem; wound: number } | undefined {
  const [locationId, woundText] = (key ?? "").split(":");
  const location = actor.items.get(locationId ?? "");
  const wound = Number(woundText);
  if (
    !isDocumentSubType<HitLocationItem>(location, ItemTypeEnum.HitLocation) ||
    !Number.isInteger(wound) ||
    wound < 0 ||
    wound >= location.system.wounds.length
  ) {
    return undefined;
  }
  return { location, wound };
}

function healableLocations(actor: RqgActor, includeSevered: boolean): HitLocationItem[] {
  return (
    actor.items.filter(
      (item) =>
        isDocumentSubType<HitLocationItem>(item, ItemTypeEnum.HitLocation) &&
        (item.system.wounds.length > 0 ||
          (includeSevered && item.system.hitLocationHealthState === "severed")),
    ) as HitLocationItem[]
  ).sort((a, b) => (b.system.dieFrom ?? 0) - (a.system.dieFrom ?? 0));
}

function isSevered(location: HitLocationItem): boolean {
  return location.system.hitLocationHealthState === "severed";
}

/** What the wounds the dialog lists look like, to notice if they change while it is open. */
function woundsSnapshot(locations: HitLocationItem[]): string {
  return JSON.stringify(
    locations.map((location) => [location.id, location.system.wounds, isSevered(location)]),
  );
}

/** All points on the location with the worst wound, spread there worst first. */
export function locationPresets(locations: HitLocationItem[], points: number): number[] {
  const allWounds = locations.flatMap((location) => location.system.wounds);
  const worst = locations.find((location) =>
    location.system.wounds.includes(Math.max(...allWounds)),
  );
  return locations.flatMap((location) =>
    location === worst
      ? distributeHealing(location.system.wounds, points)
      : location.system.wounds.map(() => 0),
  );
}

/** The key of the largest wound, preferring `preferredLocation`; ties go to the first listed. */
function largestWoundKey(
  locations: HitLocationItem[],
  preferredLocation?: HitLocationItem,
): string | undefined {
  const candidates = preferredLocation?.system.wounds.length ? [preferredLocation] : locations;
  let best: { key: string; damage: number } | undefined;
  for (const location of candidates) {
    location.system.wounds.forEach((damage, index) => {
      if (!best || damage > best.damage) {
        best = { key: woundKey(location, index), damage };
      }
    });
  }
  return best?.key;
}

/** Which severed locations start with Reattach ticked. */
function initialReattachIds(mode: HealDialogMode, locations: HitLocationItem[]): string[] {
  const severed = locations.filter(isSevered);
  // A spell suggests reattaching; split mode only when there's no choice of limb to make
  if (mode === "location" || (mode === "split" && severed.length === 1)) {
    return severed.map((location) => location.id!);
  }
  return [];
}

async function renderHealDialogContent(
  dialogId: string,
  mode: HealDialogMode,
  locations: HitLocationItem[],
  options: {
    points: number;
    selectedKey: string | undefined;
    offerReattach: boolean;
    reattachIds: string[];
    healAll?: boolean;
    healFeedback?: string;
  },
): Promise<string> {
  const allWounds = locations.flatMap((location) => location.system.wounds);
  const presets =
    mode === "split"
      ? distributeHealing(allWounds, options.points)
      : mode === "location"
        ? locationPresets(locations, options.points)
        : [];
  let presetIndex = 0;
  return foundry.applications.handlebars.renderTemplate(templatePaths.hitLocationHealWound, {
    dialogId,
    free: mode === "free",
    dots: mode === "split" || mode === "location",
    burstLabel:
      mode === "location"
        ? localize("RQG.Item.HitLocation.HealWound.HealWoundFirst")
        : localize("RQG.Item.HitLocation.HealWound.ClearWoundHealing"),
    heal: options.points,
    healAll: !!options.healAll,
    maxHeal: Math.max(1, ...allWounds),
    points: options.points,
    selectedKey: options.selectedKey,
    healFeedback: options.healFeedback ?? "",
    locations: locations.map((location) => ({
      name: location.name,
      hpValue: location.system.hitPoints.value,
      hpMax: location.system.hitPoints.max,
      severed: isSevered(location),
      id: location.id,
      reattachName:
        options.offerReattach && isSevered(location) ? `reattach-${location.id}` : undefined,
      reattachChecked: options.reattachIds.includes(location.id!),
      wounds: location.system.wounds.map((value, index) => ({
        key: woundKey(location, index),
        value,
        preset: presets[presetIndex++] ?? 0,
      })),
    })),
  });
}

/**
 * Let the user pick which of the actor's wounds to heal, on all its wounded locations - part of
 * the public API, used by healing spells. Resolves undefined when cancelled, when nothing is
 * wounded, or when the wounds changed while the dialog was open (the caller can ask again).
 */
export async function chooseWounds(
  actor: RqgActor,
  options: ChooseWoundsOptions,
): Promise<ChosenHealing | undefined> {
  assertDocumentSubType<CharacterActor>(actor, ActorTypeEnum.Character);
  const offerReattach = !!options.offerReattach;
  const locations = healableLocations(actor, offerReattach);
  if (!locations.length) {
    return undefined;
  }
  const snapshot = woundsSnapshot(locations);
  const dialogId = `choose-wounds-${foundry.utils.randomID()}`;
  const content = await renderHealDialogContent(dialogId, options.mode, locations, {
    points: options.points,
    selectedKey: largestWoundKey(locations),
    offerReattach,
    reattachIds: initialReattachIds(options.mode, locations),
  });

  const result = await foundry.applications.api.DialogV2.wait({
    id: dialogId,
    window: { title: options.title },
    position: { width: 350 },
    content: dialogContent(content),
    classes: [systemId, "dialog", "heal-wound"],
    render: (_event, dialog) => {
      const root = dialog.form ?? dialog.element;
      if (root && options.mode !== "single") {
        initializeDotBudget(root, options.points, options.mode);
      }
    },
    buttons: [
      {
        action: "submit",
        label: "RQG.Item.HitLocation.HealWound.btnHeal",
        icon: "fas fa-heart-pulse",
        default: true,
        callback: (_event, button) => {
          if (woundsSnapshot(healableLocations(actor, offerReattach)) !== snapshot) {
            ui.notifications?.warn(localize("RQG.Item.HitLocation.HealWound.WoundsChanged"));
            return null;
          }
          return button.form ? readChosenHealing(actor, button.form, options) : null;
        },
      },
      {
        action: "cancel",
        label: "RQG.Dialog.Common.btnCancel",
        icon: "fas fa-times",
      },
    ],
    rejectClose: false,
  });
  return result && typeof result === "object" ? (result as ChosenHealing) : undefined;
}

function readChosenHealing(
  actor: RqgActor,
  form: HTMLFormElement,
  options: ChooseWoundsOptions,
): ChosenHealing {
  return { wounds: readChosenWounds(actor, form, options), reattach: readReattach(actor, form) };
}

function readChosenWounds(
  actor: RqgActor,
  form: HTMLFormElement,
  options: ChooseWoundsOptions,
): WoundChoice[] {
  if (options.mode === "single") {
    const chosen = parseWoundKey(
      actor,
      form.querySelector<HTMLInputElement>('input[name="wound"]:checked')?.value,
    );
    return chosen ? [{ ...chosen, points: options.points }] : [];
  }
  return Array.from(form.querySelectorAll<RqgDotPickerElement>("rqg-dot-picker")).flatMap(
    (picker) => {
      const chosen = parseWoundKey(actor, picker.name.slice("points-".length));
      return chosen && picker.value > 0 ? [{ ...chosen, points: picker.value }] : [];
    },
  );
}

function readReattach(actor: RqgActor, form: HTMLFormElement): HitLocationItem[] {
  return Array.from(
    form.querySelectorAll<HTMLInputElement>('input[name^="reattach-"]:checked'),
  ).flatMap((input) => {
    const location = actor.items.get(input.name.slice("reattach-".length));
    return isDocumentSubType<HitLocationItem>(location, ItemTypeEnum.HitLocation) ? [location] : [];
  });
}

/**
 * Keep the dots within the points. `split`: every wound can take what is left. `location`: all
 * points go to one location - a wound's burst moves them there with that wound first, a dot sets
 * its wound and the rest spill worst first, and other locations' dots can't be picked. Only one
 * Reattach box counts per cast.
 */
function initializeDotBudget(root: HTMLElement, points: number, mode: "split" | "location"): void {
  const budget = root.querySelector<HTMLElement>("[data-heal-budget]");
  const rows = Array.from(root.querySelectorAll<HTMLElement>(".wound-dialog-split-wound"));
  const reattachBoxes = Array.from(
    root.querySelectorAll<HTMLInputElement>('input[name^="reattach-"]'),
  );
  const pickerOf = (row: HTMLElement) => row.querySelector<RqgDotPickerElement>("rqg-dot-picker")!;
  const locationOf = (element: HTMLElement) =>
    element.closest<HTMLElement>(".heal-location")?.dataset["locationId"] ?? "";
  const value = (row: HTMLElement) => pickerOf(row).value;
  const damage = (row: HTMLElement) => pickerOf(row).max;
  const sum = (values: number[]) => values.reduce((total, n) => total + n, 0);

  let active = locationOf(
    rows.find((row) => value(row) > 0) ??
      rows[0] ??
      reattachBoxes.find((box) => box.checked) ??
      root,
  );
  const activeRows = () => rows.filter((row) => locationOf(row) === active);
  const target = () => Math.min(points, sum(activeRows().map(damage)));

  /** `first` gets `firstPoints` (as far as the others can't take the rest), the others spill. */
  const fill = (first?: HTMLElement, firstPoints?: number) => {
    let left = target();
    const others = activeRows().filter((row) => row !== first);
    if (first) {
      const firstValue = Math.max(
        left - sum(others.map(damage)),
        Math.min(firstPoints ?? damage(first), damage(first), left),
      );
      pickerOf(first).setValueQuietly(firstValue);
      left -= firstValue;
    }
    const spill = distributeHealing(others.map(damage), left);
    others.forEach((row, index) => pickerOf(row).setValueQuietly(spill[index] ?? 0));
    rows
      .filter((row) => locationOf(row) !== active)
      .forEach((row) => pickerOf(row).setValueQuietly(0));
  };

  const activate = (location: string) => {
    if (location !== active) {
      active = location;
      reattachBoxes.forEach((box) => (box.checked = locationOf(box) === active));
    }
  };

  const update = () => {
    if (mode === "split") {
      const left = points - sum(rows.map(value));
      rows.forEach((row) => (pickerOf(row).limit = value(row) + left));
      if (budget) {
        budget.textContent = localize("RQG.Item.HitLocation.HealWound.PointsLeft", {
          left: String(left),
          points: String(points),
        });
      }
    } else {
      const reach = target();
      rows.forEach((row) => (pickerOf(row).limit = locationOf(row) === active ? reach : 0));
      reattachBoxes
        .filter((box) => locationOf(box) !== active)
        .forEach((box) => (box.checked = false));
      if (budget) {
        const wasted = points - reach;
        budget.textContent =
          wasted > 0
            ? localize("RQG.Item.HitLocation.HealWound.PointsWasted", {
                wasted: String(wasted),
                points: String(points),
              })
            : "";
      }
    }
    rows.forEach((row) => row.classList.toggle("is-chosen", value(row) > 0));
  };

  for (const row of rows) {
    const burst = row.querySelector<HTMLElement>("[data-burst]");
    const onBurst = () => {
      if (mode === "split") {
        pickerOf(row).setValueQuietly(0);
      } else {
        activate(locationOf(row));
        fill(row);
      }
      update();
    };
    burst?.addEventListener("click", onBurst);
    burst?.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onBurst();
      }
    });
    pickerOf(row).addEventListener("change", () => {
      if (mode === "location") {
        fill(row, value(row));
      }
      update();
    });
  }
  for (const box of reattachBoxes) {
    box.addEventListener("change", () => {
      if (box.checked && mode === "split") {
        reattachBoxes.filter((other) => other !== box).forEach((other) => (other.checked = false));
      }
      if (box.checked && mode === "location" && locationOf(box) !== active) {
        activate(locationOf(box));
        fill();
      }
      update();
    });
  }
  update();
}

function getHealDialogAppId(actor: RqgActor): string {
  // Unlinked tokens share their base actor's id
  return `heal-wound-${(actor.uuid ?? actor.id ?? "").replaceAll(".", "-")}`;
}

/** The sheet's heal dialog's form as it is now, to keep it across a rerender. */
function readSheetDialogState(
  actor: RqgActor,
  form: ParentNode,
  state: SheetDialogState,
): SheetDialogState {
  const checkedWound = form.querySelector<HTMLInputElement>('input[name="wound"]:checked')?.value;
  const points = Number(
    (form.querySelector('range-picker[name="heal"]') as { value?: unknown } | null)?.value,
  );
  return {
    ...state,
    healAll:
      form.querySelector<HTMLInputElement>('input[name="healMode"]:checked')?.value === "all",
    healPoints: Number.isFinite(points) && points > 0 ? points : state.healPoints,
    selectedKey: parseWoundKey(actor, checkedWound) ? checkedWound : state.selectedKey,
    reattachIds: Array.from(
      form.querySelectorAll<HTMLInputElement>('input[name^="reattach-"]:checked'),
    ).map((input) => input.name.slice("reattach-".length)),
  };
}

/**
 * The sheet's heal dialog: heal any wound on the actor by hand, one wound at a time and never more
 * than that wound (as First Aid, Core p.146), or remove all damage; severed limbs are reattached
 * only when ticked. Stays open while wounds remain; `hitLocationItemId` is the location whose
 * largest wound starts selected.
 */
export async function showHitLocationHealWoundDialog(
  actor: RqgActor,
  hitLocationItemId: string,
): Promise<void> {
  assertDocumentSubType<CharacterActor>(actor, ActorTypeEnum.Character);
  const appId = getHealDialogAppId(actor);
  const existing = foundry.applications.instances.get(appId);
  if (existing) {
    existing.bringToFront();
    return;
  }

  const focusLocation = actor.items.get(hitLocationItemId) as HitLocationItem | undefined;
  let state: SheetDialogState = {
    healAll: false,
    healPoints: 1,
    selectedKey: largestWoundKey(healableLocations(actor, false), focusLocation),
    reattachIds: [],
    healFeedback: "",
  };
  const apps = actor.apps as Record<string, unknown>;

  const renderContent = () => {
    const locations = healableLocations(actor, true);
    const selectedKey = parseWoundKey(actor, state.selectedKey)
      ? state.selectedKey
      : largestWoundKey(locations);
    return renderHealDialogContent(appId, "free", locations, {
      points: state.healPoints,
      selectedKey,
      offerReattach: true,
      reattachIds: state.reattachIds,
      healAll: state.healAll,
      healFeedback: state.healFeedback,
    });
  };

  try {
    await foundry.applications.api.DialogV2.wait({
      id: appId,
      window: {
        title: localize("RQG.Item.HitLocation.HealWound.Title", { actorName: actor.name }),
      },
      position: { width: 350 },
      form: { closeOnSubmit: false },
      content: dialogContent(await renderContent()),
      classes: [systemId, "dialog", "heal-wound"],
      render: async (_event, dialog) => {
        // Rerender when the actor or its hit locations change elsewhere
        apps[appId] = dialog;
        const contentNode = dialog.element?.querySelector<HTMLElement>(".dialog-content");
        const root = dialog.form ?? dialog.element;
        if (!contentNode || !root) {
          return;
        }
        contentNode.innerHTML = await renderContent();
        initializeHealModeToggle(root);
        // DialogV2 rebuilds its content before this callback, so keep the choices as they are made
        contentNode.onchange = () => (state = readSheetDialogState(actor, contentNode, state));
      },
      buttons: [
        {
          action: "submit",
          label: "RQG.Item.HitLocation.HealWound.btnHeal",
          icon: "fas fa-heart-pulse",
          default: true,
          callback: async (_event, button, dialog): Promise<boolean> => {
            const form = button.form;
            if (!form) {
              return false;
            }
            state = readSheetDialogState(actor, form, state);
            const chosen = parseWoundKey(
              actor,
              form.querySelector<HTMLInputElement>('input[name="wound"]:checked')?.value,
            );
            const reattach = readReattach(actor, form);

            // Avoid an automatic rerender while the animation runs; rerendered below
            delete apps[appId];
            let result: HealSubmitResult;
            try {
              result = await applyHealing(actor, state.healAll, chosen, state.healPoints, reattach);
              await animateHealWoundTransition(form, result);
            } finally {
              apps[appId] = dialog;
            }

            if (state.healAll || !result.hasRemainingWounds) {
              await dialog.close();
              return true;
            }
            const remaining = healableLocations(actor, false);
            const stillThere =
              chosen && remaining.includes(chosen.location) ? chosen.location : undefined;
            state = {
              ...state,
              healFeedback: localize("RQG.Item.HitLocation.HealWound.FeedbackHealedSingle", {
                healPoints: String(state.healPoints),
              }),
              selectedKey: result.woundReduced
                ? state.selectedKey
                : largestWoundKey(remaining, stillThere),
              reattachIds: [],
            };
            const contentNode = dialog.element?.querySelector<HTMLElement>(".dialog-content");
            if (contentNode) {
              contentNode.innerHTML = await renderContent();
              initializeHealModeToggle(dialog.form ?? dialog.element);
            }
            return false;
          },
        },
        {
          action: "cancel",
          label: "RQG.Dialog.Common.btnCancel",
          icon: "fas fa-times",
          callback: async (_event, _button, dialog): Promise<boolean> => {
            await dialog.close();
            return false;
          },
        },
      ],
    });
  } finally {
    delete apps[appId];
  }
}

async function applyHealing(
  actor: RqgActor,
  healAll: boolean,
  chosen: { location: HitLocationItem; wound: number } | undefined,
  points: number,
  reattach: HitLocationItem[],
): Promise<HealSubmitResult> {
  const restoreSevered = (location: HitLocationItem) => reattach.includes(location);
  const reattachOthers = async (healed: HitLocationItem[]) => {
    for (const location of reattach.filter((location) => !healed.includes(location))) {
      await actor.heal({ location, points: 0, restoreSevered: true });
    }
  };

  if (healAll) {
    const wounded = healableLocations(actor, false);
    for (const location of wounded) {
      await actor.heal({ location, points: "all", restoreSevered: restoreSevered(location) });
    }
    await reattachOthers(wounded);
    return {
      hasRemainingWounds: false,
      healAllWounds: true,
      woundRemoved: wounded.length > 0,
      woundReduced: false,
    };
  }

  if (!chosen) {
    await reattachOthers([]);
    return {
      hasRemainingWounds: healableLocations(actor, false).length > 0,
      healAllWounds: false,
      woundRemoved: false,
      woundReduced: false,
    };
  }

  const woundsBefore = [...chosen.location.system.wounds];
  await actor.heal({
    location: chosen.location,
    points,
    wound: chosen.wound,
    restoreSevered: restoreSevered(chosen.location),
  });
  await reattachOthers([chosen.location]);
  const woundsAfter = chosen.location.system.wounds;
  const woundRemoved = woundsAfter.length < woundsBefore.length;
  return {
    hasRemainingWounds: healableLocations(actor, false).length > 0,
    healAllWounds: false,
    woundRemoved,
    woundReduced:
      !woundRemoved && (woundsAfter[chosen.wound] ?? 0) < (woundsBefore[chosen.wound] ?? 0),
  };
}

async function animateHealWoundTransition(
  root: ParentNode,
  result: HealSubmitResult,
): Promise<void> {
  const woundContainer = root.querySelector<HTMLElement>("#healWoundOptions");
  if (!woundContainer) {
    return;
  }

  if (result.healAllWounds && result.woundRemoved) {
    const allOptions = Array.from(
      woundContainer.querySelectorAll<HTMLElement>(".wound-dialog-wound-option"),
    );
    if (allOptions.length === 0) {
      return;
    }
    allOptions.forEach((option) => option.classList.add("is-healed-removed"));
    await waitForHealAnimation(allOptions[0]!);
    return;
  }

  const selectedOption = root
    .querySelector<HTMLInputElement>('input[name="wound"]:checked')
    ?.closest<HTMLElement>(".wound-dialog-wound-option");

  if (!selectedOption) {
    return;
  }

  if (result.woundRemoved) {
    selectedOption.classList.add("is-healed-removed");
    await waitForHealAnimation(selectedOption);
    return;
  }

  if (result.woundReduced) {
    selectedOption.classList.add("is-healed-updated");
    const burstElement =
      selectedOption.querySelector<HTMLElement>(".wound-dialog-wound-burst") ?? selectedOption;
    await waitForHealAnimation(burstElement);
  }
}

async function waitForHealAnimation(animatedElement: HTMLElement): Promise<void> {
  const animationName = window.getComputedStyle(animatedElement).animationName;
  if (!animationName || animationName === "none") {
    return;
  }

  await new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) {
        return;
      }
      settled = true;
      window.clearTimeout(fallbackTimer);
      resolve();
    };

    const fallbackTimer = window.setTimeout(finish, HEAL_WOUND_ANIMATION_FALLBACK_MS);
    animatedElement.addEventListener("animationend", finish, { once: true });
  });
}

function initializeHealModeToggle(root: ParentNode): void {
  const healModeInputs = Array.from(
    root.querySelectorAll<HTMLInputElement>('input[name="healMode"]'),
  );
  const healPointsSection = root.querySelector<HTMLElement>("#healPointsSection");
  const woundOptions = root.querySelector<HTMLElement>("#healWoundOptions");
  const woundRadios = Array.from(root.querySelectorAll<HTMLInputElement>('input[name="wound"]'));
  const submitButtonLabel = root.querySelector<HTMLElement>('button[data-action="submit"] span');

  const syncUi = () => {
    const healAllEnabled = healModeInputs.find((input) => input.checked)?.value === "all";
    if (healPointsSection) {
      healPointsSection.hidden = healAllEnabled;
    }
    woundOptions?.classList.toggle("is-heal-all", healAllEnabled);
    woundRadios.forEach((radio) => {
      radio.disabled = healAllEnabled;
    });
    if (submitButtonLabel) {
      submitButtonLabel.textContent = healAllEnabled
        ? localize("RQG.Item.HitLocation.HealWound.btnHealAllWounds")
        : localize("RQG.Item.HitLocation.HealWound.btnHeal");
    }
  };

  healModeInputs.forEach((input) => {
    input.addEventListener("change", syncUi);
  });
  syncUi();
}
