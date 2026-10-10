import { ItemTypeEnum } from "@item-model/item-types.ts";
import type { HitLocationItem } from "@item-model/hit-location-data-model.ts";
import type { RqgActor } from "@actors/rqg-actor.ts";
import { ActorTypeEnum, type CharacterActor } from "../../data-model/actor-data/rqg-actor-data.ts";
import { assertDocumentSubType, isDocumentSubType, localize } from "../../system/util";
import { systemId } from "../../system/config";
import { templatePaths } from "../../system/load-handlebars-templates";

/** A wound picked to heal. */
export type WoundChoice = { location: HitLocationItem; wound: number; points: number };

/** What `chooseWounds` resolves to: the wounds to heal and the severed locations to reattach. */
export type ChosenHealing = { wounds: WoundChoice[]; reattach: HitLocationItem[] };

/**
 * What `chooseWounds` asks for - part of the public API. `single`: one wound gets all `points`.
 * `split`: the points are spread over wounds, worst first by default.
 */
export type ChooseWoundsOptions = {
  title: string;
  points: number;
  mode: "single" | "split";
  /** Offer a "Reattach" checkbox, checked, on each severed location. */
  offerReattach?: boolean;
};

type HealDialogMode = "free" | ChooseWoundsOptions["mode"];

type HealSubmitResult = {
  hasRemainingWounds: boolean;
  healAllWounds: boolean;
  woundRemoved: boolean;
  woundReduced: boolean;
};

const HEAL_WOUND_ANIMATION_FALLBACK_MS = 1120;

function woundKey(location: HitLocationItem, wound: number): string {
  return `${location.id}:${wound}`;
}

function parseWoundKey(
  actor: RqgActor,
  key: string | undefined,
): { location: HitLocationItem; wound: number } | undefined {
  const [locationId, wound] = (key ?? "").split(":");
  const location = actor.items.get(locationId ?? "");
  if (!isDocumentSubType<HitLocationItem>(location, ItemTypeEnum.HitLocation)) {
    return undefined;
  }
  return { location, wound: Number(wound) };
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

/**
 * How many of `points` each wound gets, worst first (Core p.314 example: "choosing his worst
 * injury first").
 */
export function distributeHealing(damages: number[], points: number): number[] {
  const order = damages.map((_damage, index) => index).sort((a, b) => damages[b]! - damages[a]!);
  const healing = damages.map(() => 0);
  let left = points;
  for (const index of order) {
    healing[index] = Math.min(damages[index]!, left);
    left -= healing[index];
  }
  return healing;
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

async function renderHealDialogContent(
  dialogId: string,
  mode: HealDialogMode,
  locations: HitLocationItem[],
  options: {
    points: number;
    selectedKey: string | undefined;
    offerReattach: boolean;
    healFeedback?: string;
  },
): Promise<string> {
  const allWounds = locations.flatMap((location) => location.system.wounds);
  const presets = mode === "split" ? distributeHealing(allWounds, options.points) : [];
  let presetIndex = 0;
  return foundry.applications.handlebars.renderTemplate(templatePaths.hitLocationHealWound, {
    dialogId,
    free: mode === "free",
    split: mode === "split",
    heal: options.points,
    maxHeal: Math.max(1, ...allWounds),
    points: options.points,
    selectedKey: options.selectedKey,
    // The sheet leaves reattaching to the user, a spell that can reattach suggests it
    reattachChecked: mode !== "free",
    healFeedback: options.healFeedback ?? "",
    locations: locations.map((location) => ({
      name: location.name,
      hpValue: location.system.hitPoints.value,
      hpMax: location.system.hitPoints.max,
      severed: location.system.hitLocationHealthState === "severed",
      reattachName:
        options.offerReattach && location.system.hitLocationHealthState === "severed"
          ? `reattach-${location.id}`
          : undefined,
      wounds: location.system.wounds.map((value, index) => ({
        key: woundKey(location, index),
        value,
        preset: presets[presetIndex++] ?? 0,
        dots: Array.from({ length: value }, (_dot, dot) => dot + 1),
      })),
    })),
  });
}

/**
 * Let the user pick which of the actor's wounds to heal, on all its wounded locations - part of
 * the public API, used by healing spells. Resolves undefined when cancelled or nothing is wounded.
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
  const dialogId = `choose-wounds-${foundry.utils.randomID()}`;
  const content = await renderHealDialogContent(dialogId, options.mode, locations, {
    points: options.points,
    selectedKey: largestWoundKey(locations),
    offerReattach,
  });

  const result = await foundry.applications.api.DialogV2.wait({
    id: dialogId,
    window: { title: options.title },
    position: { width: 350 },
    content,
    classes: [systemId, "dialog", "heal-wound"],
    render: (_event, dialog) => {
      const root = dialog.form ?? dialog.element;
      if (root && options.mode === "split") {
        initializeSplitBudget(root, options.points);
      }
    },
    buttons: [
      {
        action: "submit",
        label: "RQG.Item.HitLocation.HealWound.btnHeal",
        icon: "fas fa-heart-pulse",
        default: true,
        callback: (_event, button) =>
          button.form ? readChosenHealing(actor, button.form, options) : undefined,
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
  return Array.from(
    form.querySelectorAll<HTMLInputElement>('input[name^="points-"]:checked'),
  ).flatMap((input) => {
    const chosen = parseWoundKey(actor, input.name.slice("points-".length));
    const points = Math.max(0, Math.floor(Number(input.value) || 0));
    return chosen && points ? [{ ...chosen, points }] : [];
  });
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
 * Each wound's dots are a radio group, filled up to the checked one. Dots the points left can't
 * reach are disabled, and clicking the top filled dot again empties it.
 */
function initializeSplitBudget(root: HTMLElement, points: number): void {
  const budget = root.querySelector<HTMLElement>("[data-heal-budget]");
  const wounds = Array.from(root.querySelectorAll<HTMLElement>(".wound-dialog-split-wound"));
  const assigned = (wound: HTMLElement) =>
    Number(wound.querySelector<HTMLInputElement>('input[type="radio"]:checked')?.value) || 0;

  const update = () => {
    const left = points - wounds.reduce((sum, wound) => sum + assigned(wound), 0);
    for (const wound of wounds) {
      const reach = assigned(wound) + left;
      wound.querySelectorAll<HTMLInputElement>(".heal-dot input").forEach((dot) => {
        dot.disabled = Number(dot.value) > reach;
      });
      wound.classList.toggle("is-chosen", assigned(wound) > 0);
    }
    if (budget) {
      budget.textContent = localize("RQG.Item.HitLocation.HealWound.PointsLeft", {
        left: String(left),
        points: String(points),
      });
    }
  };

  for (const wound of wounds) {
    let before = assigned(wound);
    wound.addEventListener("pointerdown", () => (before = assigned(wound)));
    wound.querySelectorAll<HTMLInputElement>(".heal-dot input").forEach((dot) =>
      dot.addEventListener("click", () => {
        const value = Number(dot.value);
        if (value === before) {
          const lower = wound.querySelector<HTMLInputElement>(
            `input[type="radio"][value="${value - 1}"]`,
          );
          if (lower) {
            lower.checked = true;
          }
        }
        before = assigned(wound);
        update();
      }),
    );
    wound.addEventListener("change", update);
  }
  update();
}

function getHealDialogAppId(actor: RqgActor): string {
  return `heal-wound.${actor.id}`;
}

/**
 * The sheet's heal dialog: heal any wound on the actor by hand, or remove all damage. Stays open
 * while wounds remain; `hitLocationItemId` is the location whose largest wound starts selected.
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
  let selectedKey = largestWoundKey(healableLocations(actor, false), focusLocation);
  let healPoints = 1;
  let healFeedback = "";
  const apps = actor.apps as Record<string, unknown>;

  const renderContent = () =>
    renderHealDialogContent(appId, "free", healableLocations(actor, true), {
      points: healPoints,
      selectedKey,
      offerReattach: true,
      healFeedback,
    });

  try {
    await foundry.applications.api.DialogV2.wait({
      id: appId,
      window: {
        title: localize("RQG.Item.HitLocation.HealWound.Title", { actorName: actor.name }),
      },
      position: { width: 350 },
      form: { closeOnSubmit: false },
      content: await renderContent(),
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
            const formData = new foundry.applications.ux.FormDataExtended(form, {})
              .object as Record<string, unknown>;
            const healAll = formData["healMode"] === "all";
            const points = Number(formData["heal"]);
            healPoints = Number.isFinite(points) && points > 0 ? points : 1;
            const chosen = parseWoundKey(actor, formData["wound"] as string | undefined);

            // Avoid an automatic rerender while the animation runs; rerendered below
            delete apps[appId];
            const reattach = readReattach(actor, form);
            const result = await applyHealing(actor, healAll, chosen, healPoints, reattach);
            await animateHealWoundTransition(form, result);

            if (healAll || !result.hasRemainingWounds) {
              await dialog.close();
              return true;
            }
            healFeedback = localize("RQG.Item.HitLocation.HealWound.FeedbackHealedSingle", {
              healPoints: String(healPoints),
            });
            const remaining = healableLocations(actor, false);
            const stillThere =
              chosen && remaining.includes(chosen.location) ? chosen.location : undefined;
            selectedKey = form.querySelector<HTMLInputElement>(
              'input[name="wound"]:checked',
            )?.value;
            if (!result.woundReduced || !selectedKey) {
              selectedKey = largestWoundKey(remaining, stillThere);
            }
            apps[appId] = dialog;
            await dialog.render();
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

  const before = chosen.location.system.wounds.length;
  await actor.heal({
    location: chosen.location,
    points,
    wound: chosen.wound,
    restoreSevered: restoreSevered(chosen.location),
  });
  await reattachOthers([chosen.location]);
  const woundRemoved = chosen.location.system.wounds.length < before;
  return {
    hasRemainingWounds: healableLocations(actor, false).length > 0,
    healAllWounds: false,
    woundRemoved,
    woundReduced: !woundRemoved,
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
