import type { DeepPartial } from "fvtt-types/utils";
import { ItemTypeEnum } from "@item-model/item-types.ts";
import type { HitLocationItem } from "@item-model/hit-location-data-model.ts";
import type { RqgActor } from "@actors/rqg-actor.ts";
import { ActorTypeEnum, type CharacterActor } from "../../data-model/actor-data/rqg-actor-data.ts";
import { assertDocumentSubType, isDocumentSubType, localize } from "../../system/util";
import { systemId } from "../../system/config";
import { templatePaths } from "../../system/load-handlebars-templates";
import type { RqgDotPickerElement } from "../../applications/dot-picker/dot-picker-element";
import { distributeHealing, sumWounds } from "./hit-location-healing-calculations";

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
  healed: number;
  hasRemainingWounds: boolean;
  woundRemoved: boolean;
  woundReduced: boolean;
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

function isSevered(location: HitLocationItem): boolean {
  return location.system.hitLocationHealthState === "severed";
}

/** Wounded (and with `includeSevered` severed) locations, in the sheet's order. */
function healableLocations(actor: RqgActor, includeSevered: boolean): HitLocationItem[] {
  const direction = game.settings?.get(systemId, "sortHitLocationsLowToHigh") ? 1 : -1;
  return (
    actor.items.filter(
      (item) =>
        isDocumentSubType<HitLocationItem>(item, ItemTypeEnum.HitLocation) &&
        (item.system.wounds.length > 0 || (includeSevered && isSevered(item))),
    ) as HitLocationItem[]
  ).sort((a, b) => direction * ((a.system.dieFrom ?? 0) - (b.system.dieFrom ?? 0)));
}

/** What the wounds the dialog lists look like, to notice if they change while it is open. */
function woundsSnapshot(locations: HitLocationItem[]): string {
  return JSON.stringify(
    locations.map((location) => [location.id, location.system.wounds, isSevered(location)]),
  );
}

/** The wounds a rendered dialog was drawn from - stale if DialogV2 redrew its first content. */
function shownWounds(form: ParentNode): string | undefined {
  return form.querySelector<HTMLElement>("[data-wounds-snapshot]")?.dataset["woundsSnapshot"];
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
  if (mode === "location" || (mode !== "free" && severed.length === 1)) {
    return severed.map((location) => location.id!);
  }
  return [];
}

type HealDialogContext = ReturnType<typeof healDialogContext> & {
  buttons?: foundry.applications.api.ApplicationV2.FormFooterButton[];
};

function healDialogContext(
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
) {
  const allWounds = locations.flatMap((location) => location.system.wounds);
  const presets =
    mode === "split"
      ? distributeHealing(allWounds, options.points)
      : mode === "location"
        ? locationPresets(locations, options.points)
        : [];
  let presetIndex = 0;
  return {
    dialogId,
    woundsSnapshot: woundsSnapshot(locations),
    free: mode === "free",
    dots: mode === "split" || mode === "location",
    burstLabel:
      mode === "location"
        ? localize("RQG.Item.HitLocation.HealWound.HealWoundFirst")
        : localize("RQG.Item.HitLocation.HealWound.ClearWoundHealing"),
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
  };
}

/**
 * Let the user pick which of the actor's wounds to heal, on all its wounded locations - part of
 * the public API, used by healing spells. Resolves undefined when cancelled or when nothing is
 * wounded. If the wounds change while it is open, it asks again with the current ones.
 */
export async function chooseWounds(
  actor: RqgActor,
  options: ChooseWoundsOptions,
): Promise<ChosenHealing | undefined> {
  assertDocumentSubType<CharacterActor>(actor, ActorTypeEnum.Character);
  for (;;) {
    const result = await chooseWoundsOnce(actor, options);
    if (result !== "woundsChanged") {
      return result;
    }
    ui.notifications?.warn(localize("RQG.Item.HitLocation.HealWound.WoundsChanged"));
  }
}

async function chooseWoundsOnce(
  actor: RqgActor,
  options: ChooseWoundsOptions,
): Promise<ChosenHealing | "woundsChanged" | undefined> {
  const offerReattach = !!options.offerReattach;
  const locations = healableLocations(actor, offerReattach);
  if (!locations.length) {
    return undefined;
  }
  const dialogId = `choose-wounds-${foundry.utils.randomID()}`;
  const content = await foundry.applications.handlebars.renderTemplate(
    templatePaths.hitLocationHealWound,
    healDialogContext(dialogId, options.mode, locations, {
      points: options.points,
      selectedKey: largestWoundKey(locations),
      offerReattach,
      reattachIds: initialReattachIds(options.mode, locations),
    }),
  );

  const result = await foundry.applications.api.DialogV2.wait({
    id: dialogId,
    window: { title: options.title },
    position: { width: 350 },
    content: dialogContent(content),
    classes: [systemId, "dialog", "heal-wound"],
    render: (_event, dialog) => {
      const root = dialog.form ?? dialog.element;
      if (!root) {
        return;
      }
      if (options.mode === "split") {
        initializeSplitBudget(root, options.points);
        keepOneReattachTicked(root);
      } else if (options.mode === "location") {
        initializeLocationBudget(root, options.points);
      } else {
        keepOneReattachTicked(root);
      }
    },
    buttons: [
      {
        action: "submit",
        label: "RQG.Item.HitLocation.HealWound.btnHeal",
        icon: "fas fa-heart-pulse",
        default: true,
        callback: (_event, button) => {
          if (
            !button.form ||
            shownWounds(button.form) !== woundsSnapshot(healableLocations(actor, offerReattach))
          ) {
            return "woundsChanged";
          }
          const data = new foundry.applications.ux.FormDataExtended(button.form).object;
          return {
            wounds: readChosenWounds(actor, data, options),
            reattach: reattachIdsIn(data).flatMap((id) => {
              const location = actor.items.get(id);
              return isDocumentSubType<HitLocationItem>(location, ItemTypeEnum.HitLocation)
                ? [location]
                : [];
            }),
          } satisfies ChosenHealing;
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
  return result === "woundsChanged"
    ? result
    : result && typeof result === "object"
      ? (result as ChosenHealing)
      : undefined;
}

/** One reattach per cast: ticking a Reattach box unticks the others. */
function keepOneReattachTicked(root: HTMLElement): void {
  const boxes = Array.from(root.querySelectorAll<HTMLInputElement>('input[name^="reattach-"]'));
  for (const box of boxes) {
    box.addEventListener("change", () => {
      if (box.checked) {
        boxes.filter((other) => other !== box).forEach((other) => (other.checked = false));
      }
    });
  }
}

/** The location ids whose Reattach box is ticked in `data`. */
function reattachIdsIn(data: Record<string, unknown>): string[] {
  return Object.entries(data).flatMap(([name, ticked]) =>
    name.startsWith("reattach-") && ticked ? [name.slice("reattach-".length)] : [],
  );
}

function readChosenWounds(
  actor: RqgActor,
  data: Record<string, unknown>,
  options: ChooseWoundsOptions,
): WoundChoice[] {
  if (options.mode === "single") {
    const chosen = parseWoundKey(actor, data["wound"] as string | undefined);
    return chosen ? [{ ...chosen, points: options.points }] : [];
  }
  return Object.entries(data).flatMap(([name, value]) => {
    const chosen = name.startsWith("points-")
      ? parseWoundKey(actor, name.slice("points-".length))
      : undefined;
    const points = Number(value);
    return chosen && points > 0 ? [{ ...chosen, points }] : [];
  });
}

/** What the dot budgets work on: each wound's row and its dot picker. */
function dotRows(root: HTMLElement) {
  const rows = Array.from(root.querySelectorAll<HTMLElement>(".wound-dialog-split-wound"));
  const pickerOf = (row: HTMLElement) => row.querySelector<RqgDotPickerElement>("rqg-dot-picker")!;
  const showChosen = () =>
    rows.forEach((row) => row.classList.toggle("is-chosen", pickerOf(row).value > 0));
  const onRow = (row: HTMLElement, onBurst: () => void, onPick: () => void) => {
    const burst = row.querySelector<HTMLElement>("[data-burst]");
    burst?.addEventListener("click", onBurst);
    burst?.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onBurst();
      }
    });
    pickerOf(row).addEventListener("change", onPick);
  };
  return {
    rows,
    pickerOf,
    showChosen,
    onRow,
    budget: root.querySelector<HTMLElement>("[data-heal-budget]"),
  };
}

/** `split`: every wound can take what is left of the points; a burst clears its wound. */
function initializeSplitBudget(root: HTMLElement, points: number): void {
  const { rows, pickerOf, showChosen, onRow, budget } = dotRows(root);
  const update = () => {
    const left = points - sumWounds(rows.map((row) => pickerOf(row).value));
    rows.forEach((row) => (pickerOf(row).limit = pickerOf(row).value + left));
    if (budget) {
      budget.textContent = localize("RQG.Item.HitLocation.HealWound.PointsLeft", {
        left: String(left),
        points: String(points),
      });
    }
    showChosen();
  };
  for (const row of rows) {
    onRow(
      row,
      () => {
        pickerOf(row).setValueQuietly(0);
        update();
      },
      update,
    );
  }
  update();
}

/**
 * `location`: all points go to one location - a wound's burst moves them there with that wound
 * first, a dot sets its wound and the rest spill worst first, and other locations' dots can't be
 * picked. Only the healed location's Reattach box counts.
 */
function initializeLocationBudget(root: HTMLElement, points: number): void {
  const { rows, pickerOf, showChosen, onRow, budget } = dotRows(root);
  const reattachBoxes = Array.from(
    root.querySelectorAll<HTMLInputElement>('input[name^="reattach-"]'),
  );
  const locationOf = (element: HTMLElement) =>
    element.closest<HTMLElement>(".heal-location")?.dataset["locationId"] ?? "";
  const damage = (row: HTMLElement) => pickerOf(row).max;

  let active = locationOf(
    rows.find((row) => pickerOf(row).value > 0) ??
      rows[0] ??
      reattachBoxes.find((box) => box.checked) ??
      root,
  );
  const activeRows = () => rows.filter((row) => locationOf(row) === active);
  const target = () => Math.min(points, sumWounds(activeRows().map(damage)));

  /** `first` gets `firstPoints` (as far as the others can't take the rest), the others spill. */
  const fill = (first?: HTMLElement, firstPoints?: number) => {
    let left = target();
    const others = activeRows().filter((row) => row !== first);
    if (first) {
      const firstValue = Math.max(
        left - sumWounds(others.map(damage)),
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
    showChosen();
  };

  for (const row of rows) {
    onRow(
      row,
      () => {
        activate(locationOf(row));
        fill(row);
        update();
      },
      () => {
        fill(row, pickerOf(row).value);
        update();
      },
    );
  }
  for (const box of reattachBoxes) {
    box.addEventListener("change", () => {
      if (box.checked && locationOf(box) !== active) {
        activate(locationOf(box));
        fill();
      }
      update();
    });
  }
  update();
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
  // Unlinked tokens share their base actor's id
  const id = `heal-wound-${(actor.uuid ?? actor.id ?? "").replaceAll(".", "-")}`;
  const existing = foundry.applications.instances.get(id);
  if (existing) {
    existing.bringToFront();
    return;
  }
  const focusLocation = actor.items.get(hitLocationItemId);
  await new HealWoundsApp(
    actor,
    isDocumentSubType<HitLocationItem>(focusLocation, ItemTypeEnum.HitLocation)
      ? focusLocation
      : undefined,
    { id },
  ).render({
    force: true,
  });
}

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

class HealWoundsApp extends HandlebarsApplicationMixin(ApplicationV2<HealDialogContext>) {
  static override DEFAULT_OPTIONS = {
    tag: "form",
    classes: [systemId, "dialog", "heal-wound"],
    window: { contentClasses: ["standard-form"], resizable: false },
    position: { width: 350 },
    form: { handler: HealWoundsApp.onSubmit, closeOnSubmit: false },
    actions: { cancel: HealWoundsApp.onCancel },
  };

  static override PARTS = {
    content: { template: templatePaths.hitLocationHealWound },
    footer: { template: "templates/generic/form-footer.hbs" },
  };

  private healAll = false;
  private healPoints = 1;
  private selectedKey: string | undefined;
  private reattachIds: string[] = [];
  private healFeedback = "";
  /** The wounds `healFeedback` was written for. */
  private feedbackSnapshot = "";
  private animating = false;

  constructor(
    private readonly actor: RqgActor,
    focusLocation: HitLocationItem | undefined,
    options: { id: string },
  ) {
    super(options);
    this.selectedKey = largestWoundKey(healableLocations(actor, false), focusLocation);
  }

  override get title(): string {
    return localize("RQG.Item.HitLocation.HealWound.Title", { actorName: this.actor.name });
  }

  override async _prepareContext(): Promise<HealDialogContext> {
    const locations = healableLocations(this.actor, true);
    if (woundsSnapshot(locations) !== this.feedbackSnapshot) {
      this.healFeedback = "";
    }
    if (!parseWoundKey(this.actor, this.selectedKey)) {
      this.selectedKey = largestWoundKey(locations);
    }
    return {
      ...healDialogContext(this.id, "free", locations, {
        points: this.healPoints,
        selectedKey: this.selectedKey,
        offerReattach: true,
        reattachIds: this.reattachIds,
        healAll: this.healAll,
        healFeedback: this.healFeedback,
      }),
      buttons: [
        {
          type: "submit",
          icon: "fas fa-heart-pulse",
          label: this.healAll
            ? "RQG.Item.HitLocation.HealWound.btnHealAllWounds"
            : "RQG.Item.HitLocation.HealWound.btnHeal",
        },
        {
          type: "button",
          action: "cancel",
          icon: "fas fa-times",
          label: "RQG.Dialog.Common.btnCancel",
        },
      ],
    };
  }

  // Rerender when the actor or its hit locations change elsewhere
  protected override async _onFirstRender(
    context: DeepPartial<HealDialogContext>,
    options: DeepPartial<foundry.applications.api.ApplicationV2.RenderOptions>,
  ): Promise<void> {
    await super._onFirstRender(context, options);
    (this.actor.apps as Record<string, unknown>)[this.id] = this;
  }

  protected override _onClose(
    ...args: Parameters<foundry.applications.api.ApplicationV2["_onClose"]>
  ): void {
    delete (this.actor.apps as Record<string, unknown>)[this.id];
    super._onClose(...args);
  }

  /** The heal animation runs on the old wounds; rendered when it is done. */
  protected override _canRender(): false | void {
    if (this.animating) {
      return false;
    }
  }

  protected override _onChangeForm(
    formConfig: foundry.applications.api.ApplicationV2.FormConfiguration,
    event: Event,
  ): void {
    super._onChangeForm(formConfig, event);
    const wasHealAll = this.healAll;
    this.readForm(new foundry.applications.ux.FormDataExtended(this.element as HTMLFormElement));
    if (this.healAll !== wasHealAll) {
      void this.render();
    }
  }

  private readForm(formData: foundry.applications.ux.FormDataExtended): void {
    const data = formData.object;
    const points = Number(data["heal"]);
    const wound = data["wound"] as string | undefined;
    this.healAll = data["healMode"] === "all";
    this.healPoints = Number.isFinite(points) && points > 0 ? points : this.healPoints;
    this.selectedKey = parseWoundKey(this.actor, wound) ? wound : this.selectedKey;
    this.reattachIds = reattachIdsIn(data);
  }

  private static onCancel(this: HealWoundsApp): void {
    void this.close();
  }

  private static async onSubmit(
    this: HealWoundsApp,
    _event: Event | SubmitEvent,
    form: HTMLFormElement,
    formData: foundry.applications.ux.FormDataExtended,
  ): Promise<void> {
    this.readForm(formData);
    const actor = this.actor;
    if (shownWounds(form) !== woundsSnapshot(healableLocations(actor, true))) {
      ui.notifications?.warn(localize("RQG.Item.HitLocation.HealWound.WoundsChanged"));
      await this.render();
      return;
    }
    const chosen = this.healAll ? undefined : parseWoundKey(actor, this.selectedKey);
    const reattach = this.reattachIds.flatMap((id) => {
      const location = actor.items.get(id);
      return isDocumentSubType<HitLocationItem>(location, ItemTypeEnum.HitLocation)
        ? [location]
        : [];
    });

    this.animating = true;
    let result: HealSubmitResult;
    try {
      result = await applyHealing(actor, this.healAll, chosen, this.healPoints, reattach);
      await animateHealWoundTransition(form, this.healAll, result);
    } finally {
      this.animating = false;
    }

    if (this.healAll || !result.hasRemainingWounds) {
      await this.close();
      return;
    }
    const remaining = healableLocations(actor, false);
    const stillThere = chosen && remaining.includes(chosen.location) ? chosen.location : undefined;
    this.healFeedback = localize("RQG.Item.HitLocation.HealWound.FeedbackHealedSingle", {
      healPoints: String(result.healed),
    });
    this.feedbackSnapshot = woundsSnapshot(healableLocations(actor, true));
    if (!result.woundReduced) {
      this.selectedKey = largestWoundKey(remaining, stillThere);
    }
    this.reattachIds = [];
    await this.render();
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
      healed: 0,
      hasRemainingWounds: false,
      woundRemoved: wounded.length > 0,
      woundReduced: false,
    };
  }

  if (!chosen) {
    await reattachOthers([]);
    return {
      healed: 0,
      hasRemainingWounds: healableLocations(actor, false).length > 0,
      woundRemoved: false,
      woundReduced: false,
    };
  }

  const woundsBefore = [...chosen.location.system.wounds];
  const { healed } = await actor.heal({
    location: chosen.location,
    points,
    wound: chosen.wound,
    restoreSevered: restoreSevered(chosen.location),
  });
  await reattachOthers([chosen.location]);
  const woundsAfter = chosen.location.system.wounds;
  const woundRemoved = woundsAfter.length < woundsBefore.length;
  return {
    healed,
    hasRemainingWounds: healableLocations(actor, false).length > 0,
    woundRemoved,
    woundReduced:
      !woundRemoved && (woundsAfter[chosen.wound] ?? 0) < (woundsBefore[chosen.wound] ?? 0),
  };
}

async function animateHealWoundTransition(
  root: ParentNode,
  healAll: boolean,
  result: HealSubmitResult,
): Promise<void> {
  const woundContainer = root.querySelector<HTMLElement>("#healWoundOptions");
  if (!woundContainer) {
    return;
  }

  if (healAll && result.woundRemoved) {
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
