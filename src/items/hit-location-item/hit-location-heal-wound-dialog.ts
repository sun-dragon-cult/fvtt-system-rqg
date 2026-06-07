import { ItemTypeEnum } from "@item-model/item-types.ts";
import type { HitLocationItem } from "@item-model/hit-location-data-model.ts";
import type { RqgActor } from "@actors/rqg-actor.ts";
import { ActorTypeEnum, type CharacterActor } from "../../data-model/actor-data/rqg-actor-data.ts";
import { assertDocumentSubType, localize } from "../../system/util";
import { RqgItem } from "../rqg-item";
import { systemId } from "../../system/config";
import { templatePaths } from "../../system/load-handlebars-templates";

type HealSubmitResult = {
  hasRemainingWounds: boolean;
  healAllWounds: boolean;
  woundRemoved: boolean;
  woundReduced: boolean;
};

type HealWoundFormValues = {
  healAllRequested: boolean;
  healPoints: number;
  persistedHealValue: number;
  selectedWoundIndex: number;
};

const HEAL_WOUND_ANIMATION_FALLBACK_MS = 1120;

function getHitLocationHealDialogAppId(hitLocationItemId: string): string {
  return `heal-wound.${hitLocationItemId}`;
}

export async function showHitLocationHealWoundDialog(
  actor: RqgActor,
  hitLocationItemId: string,
): Promise<void> {
  assertDocumentSubType<CharacterActor>(actor, ActorTypeEnum.Character);
  const hitLocation = actor.items.get(hitLocationItemId) as RqgItem | undefined;
  assertDocumentSubType<HitLocationItem>(hitLocation, ItemTypeEnum.HitLocation);

  const registeredDialogAppId = getHitLocationHealDialogAppId(hitLocationItemId);

  const dialogContentHtml = await renderHealWoundDialogContent(hitLocation, 1, "", 0);

  try {
    await foundry.applications.api.DialogV2.wait({
      id: registeredDialogAppId,
      window: {
        title: localize("RQG.Item.HitLocation.HealWound.Title", {
          hitLocationName: hitLocation.name,
        }),
      },
      position: { width: 350 },
      form: { closeOnSubmit: false },
      content: dialogContentHtml,
      classes: [systemId, "dialog", "heal-wound"],
      render: async (_event, dialog) => {
        const currentHitLocation = actor.items.get(hitLocationItemId) as RqgItem | undefined;
        assertDocumentSubType<HitLocationItem>(currentHitLocation, ItemTypeEnum.HitLocation);

        // Keep the dialog registered on the latest item instance so external updates rerender it.
        (currentHitLocation.apps as Record<string, unknown>)[registeredDialogAppId] = dialog;

        const contentNode = dialog.element?.querySelector<HTMLElement>(".dialog-content");
        if (!contentNode) {
          return;
        }
        const refreshedContentHtml = await renderHealWoundDialogContent(
          currentHitLocation,
          1,
          "",
          0,
        );
        contentNode.innerHTML = refreshedContentHtml;

        const root = dialog.form ?? dialog.element;
        if (!root) {
          return;
        }
        initializeHealWoundDialogUi(root);
      },
      buttons: [
        {
          action: "submit",
          label: localize("RQG.Item.HitLocation.HealWound.btnHealWound"),
          icon: "fas fa-heart-pulse",
          default: true,
          callback: async (_ev, button, dialog): Promise<boolean> => {
            const form = button.form;
            if (!form) {
              return false;
            }

            return handleHealWoundSubmit(
              form,
              dialog,
              actor,
              hitLocationItemId,
              registeredDialogAppId,
            );
          },
        },
        {
          action: "cancel",
          label: localize("RQG.Dialog.Common.btnCancel"),
          icon: "fas fa-times",
          callback: async (_ev, _button, dialog): Promise<boolean> => {
            await dialog.close();
            return false;
          },
        },
      ],
    });
  } finally {
    const currentHitLocation = actor.items.get(hitLocationItemId) as RqgItem | undefined;
    if (currentHitLocation) {
      delete (currentHitLocation.apps as Record<string, unknown>)[registeredDialogAppId];
    }
  }
}

async function handleHealWoundSubmit(
  form: HTMLFormElement,
  dialog: foundry.applications.api.DialogV2.Any,
  actor: RqgActor,
  hitLocationItemId: string,
  registeredDialogAppId: string,
): Promise<boolean> {
  const formValues = readHealWoundFormValues(form);

  const currentHitLocation = actor.items.get(hitLocationItemId) as RqgItem | undefined;
  assertDocumentSubType<HitLocationItem>(currentHitLocation, ItemTypeEnum.HitLocation);

  // Avoid Foundry auto-rerender while animations run; we refresh manually below.
  delete (currentHitLocation.apps as Record<string, unknown>)[registeredDialogAppId];

  const healResult = await applyHealWoundFormData(actor, currentHitLocation, formValues);

  await animateHealWoundTransition(form, healResult);

  if (formValues.healAllRequested || !healResult.hasRemainingWounds) {
    await dialog.close();
    return true;
  }

  const refreshedHitLocation = actor.items.get(hitLocationItemId) as RqgItem | undefined;
  assertDocumentSubType<HitLocationItem>(refreshedHitLocation, ItemTypeEnum.HitLocation);
  (refreshedHitLocation.apps as Record<string, unknown>)[registeredDialogAppId] = dialog;

  const contentNode = dialog.element?.querySelector<HTMLElement>(".dialog-content");
  if (!contentNode) {
    return false;
  }

  const refreshedContentHtml = await renderHealWoundDialogContent(
    refreshedHitLocation,
    formValues.persistedHealValue,
    formValues.healAllRequested
      ? localize("RQG.Item.HitLocation.HealWound.FeedbackHealedAll")
      : localize("RQG.Item.HitLocation.HealWound.FeedbackHealedSingle", {
          healPoints: String(formValues.persistedHealValue),
        }),
    Math.min(
      formValues.selectedWoundIndex,
      Math.max((refreshedHitLocation.system.wounds ?? []).length - 1, 0),
    ),
  );
  contentNode.innerHTML = refreshedContentHtml;
  const root = dialog.form ?? dialog.element;
  if (!root) {
    return false;
  }
  initializeHealWoundDialogUi(root);

  return false;
}

async function renderHealWoundDialogContent(
  hitLocation: RqgItem,
  heal: number,
  healFeedback: string,
  selectedWoundIndex: number,
): Promise<string> {
  const wounds = hitLocation.system.wounds ?? [];
  return foundry.applications.handlebars.renderTemplate(templatePaths.hitLocationHealWound, {
    hasMultipleWounds: wounds.length > 1,
    heal,
    healFeedback,
    hitLocation,
    selectedWoundIndex,
  });
}

function readHealWoundFormValues(form: HTMLFormElement): HealWoundFormValues {
  const formData = new foundry.applications.ux.FormDataExtended(form, {}).object as Record<
    string,
    FormDataEntryValue | null | undefined
  >;

  const healValue = Number(formData["heal"]);
  const persistedHealValue = Number.isFinite(healValue) && healValue > 0 ? healValue : 1;
  const healAllRequested = formData["healMode"] === "all";
  const selectedWoundValue = Number(formData["wound"]);
  const selectedWoundIndex =
    Number.isInteger(selectedWoundValue) && selectedWoundValue >= 0 ? selectedWoundValue : 0;

  return {
    healAllRequested,
    healPoints: healValue,
    persistedHealValue,
    selectedWoundIndex,
  };
}

async function applyHealWoundFormData(
  actor: RqgActor,
  hitLocation: RqgItem,
  formValues: HealWoundFormValues,
): Promise<HealSubmitResult> {
  assertDocumentSubType<HitLocationItem>(hitLocation, ItemTypeEnum.HitLocation);
  const healAllWounds = formValues.healAllRequested;
  const healWoundIndex = formValues.selectedWoundIndex;
  const healPoints = formValues.healPoints;
  const beforeWounds = [...(hitLocation.system.wounds ?? [])];

  if (healAllWounds) {
    const totalWoundDamage = hitLocation.system.wounds.reduce((sum, wound) => sum + wound, 0);
    if (totalWoundDamage <= 0 && hitLocation.system.wounds.length === 0) {
      return {
        hasRemainingWounds: false,
        healAllWounds: true,
        woundRemoved: false,
        woundReduced: false,
      };
    }

    const nextHitLocationHealthState =
      hitLocation.system.hitLocationHealthState === "severed" ? "severed" : "healthy";

    await hitLocation.update({
      system: {
        wounds: [],
        actorHealthImpact: "healthy",
        hitLocationHealthState: nextHitLocationHealthState,
      },
    } as Item.UpdateData);

    const actorCurrentHp = actor.system.attributes.hitPoints.value ?? 0;
    const actorMaxHp = actor.system.attributes.hitPoints.max ?? CONFIG.RQG.minTotalHitPoints;
    const healedActorHp = Math.min(actorCurrentHp + totalWoundDamage, actorMaxHp);
    if (healedActorHp !== actorCurrentHp) {
      await actor.update({
        system: { attributes: { hitPoints: { value: healedActorHp } } },
      } as Actor.UpdateData);
    }

    return {
      hasRemainingWounds: false,
      healAllWounds: true,
      woundRemoved: beforeWounds.length > 0,
      woundReduced: false,
    };
  }

  if (!Number.isFinite(healPoints) || healPoints <= 0) {
    return {
      hasRemainingWounds: hitLocation.system.wounds.length > 0,
      healAllWounds: false,
      woundRemoved: false,
      woundReduced: false,
    };
  }

  const hasRemainingWounds = await hitLocation.healWound(healWoundIndex, healPoints);
  const afterWounds = hitLocation.system.wounds ?? [];
  const woundRemoved = afterWounds.length < beforeWounds.length;
  const beforeValue = beforeWounds[healWoundIndex] ?? 0;
  const afterValue = afterWounds[healWoundIndex] ?? 0;
  const woundReduced = !woundRemoved && afterValue < beforeValue;

  return {
    hasRemainingWounds,
    healAllWounds: false,
    woundRemoved,
    woundReduced,
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

function initializeHealWoundDialogUi(root: ParentNode): void {
  const healPicker = root.querySelector<HTMLElement>("range-picker");
  const healModeInputs = Array.from(
    root.querySelectorAll<HTMLInputElement>('input[name="healMode"]'),
  );
  const healPointsSection = root.querySelector<HTMLElement>("#healPointsSection");
  const woundOptionsLabel = root.querySelector<HTMLElement>("#healWoundOptionsLabel");
  const woundOptions = root.querySelector<HTMLElement>("#healWoundOptions");
  const woundRadios = Array.from(root.querySelectorAll<HTMLInputElement>('input[name="wound"]'));
  const submitButtonLabel = root.querySelector<HTMLElement>('button[data-action="submit"] span');

  if (!healPicker) {
    return;
  }

  const syncUi = () => {
    if (!woundOptions) {
      return;
    }

    const selectedHealMode = healModeInputs.find((input) => input.checked)?.value;
    const healAllEnabled = selectedHealMode === "all";
    if (healPointsSection) {
      healPointsSection.hidden = healAllEnabled;
    }
    if (woundOptionsLabel) {
      woundOptionsLabel.hidden = healAllEnabled;
    }
    woundOptions.hidden = healAllEnabled;
    woundRadios.forEach((radio) => {
      radio.disabled = healAllEnabled;
    });

    if (submitButtonLabel) {
      submitButtonLabel.textContent = healAllEnabled
        ? localize("RQG.Item.HitLocation.HealWound.btnHealAllWounds")
        : localize("RQG.Item.HitLocation.HealWound.btnHealWound");
    }
  };

  healModeInputs.forEach((input) => {
    input.addEventListener("change", syncUi);
  });
  syncUi();
}
