import { ItemTypeEnum } from "@item-model/itemTypes.ts";
import type { ArmorItem } from "@item-model/armorDataModel.ts";
import type { HitLocationItem } from "@item-model/hitLocationDataModel.ts";
import type { RqgActor } from "@actors/rqgActor.ts";
import { ActorTypeEnum, type CharacterActor } from "../../data-model/actor-data/rqgActorData.ts";
import { assertDocumentSubType, isDocumentSubType, localize } from "../../system/util";
import { RqgItem } from "../rqgItem";
import { systemId } from "../../system/config";
import { templatePaths } from "../../system/loadHandlebarsTemplates";

type ArmorLayerDialogData = {
  name: string;
  absorbs: number;
};

type HealSubmitResult = {
  hasRemainingWounds: boolean;
  healAllWounds: boolean;
  woundRemoved: boolean;
  woundReduced: boolean;
};

const HEAL_WOUND_ANIMATION_MS = 1120;

function getHitLocationHealDialogAppId(hitLocationItemId: string): string {
  return `heal-wound.${hitLocationItemId}`;
}

export async function showHitLocationAddWoundDialog(
  actor: RqgActor,
  hitLocationItemId: string,
): Promise<void> {
  const hitLocation = actor.items.get(hitLocationItemId) as RqgItem | undefined;
  assertDocumentSubType<HitLocationItem>(
    hitLocation,
    ItemTypeEnum.HitLocation,
    "RQG.Item.HitLocation.Notification.CantFindHitLocation",
  );

  const armorLayers = getEquippedArmorLayersForHitLocation(actor, hitLocation);

  const dialogContentHtml = await foundry.applications.handlebars.renderTemplate(
    templatePaths.hitLocationAddWound,
    {
      hasMultipleArmorLayers: armorLayers.length > 1,
      hitLocationItemId,
      hitLocationCurrentHp: hitLocation.system.hitPoints.value ?? 0,
      hitLocationMaxHp: hitLocation.system.hitPoints.max ?? 0,
      actorCurrentHp: actor.system.attributes.hitPoints.value ?? 0,
      actorMaxHp: actor.system.attributes.hitPoints.max ?? 0,
      hitLocationAp: hitLocation.system.armorPoints ?? 0,
      armorLayers,
    },
  );
  void foundry.applications.api.DialogV2.wait({
    window: {
      title: localize("RQG.Item.HitLocation.AddWound.Title", {
        hitLocationName: hitLocation.name,
      }),
    },
    position: { width: 350 },
    content: dialogContentHtml,
    classes: [systemId, "dialog", "add-wound"],
    render: (_event, dialog) => {
      const root = dialog.form ?? dialog.element;
      if (!root) {
        return;
      }
      initializeAddWoundDialogUi(root);
    },
    buttons: [
      {
        action: "submit",
        label: localize("RQG.Item.HitLocation.AddWound.btnAddWound"),
        icon: "fas fa-burst",
        default: true,
        callback: async (_ev, button) => {
          const form = button.form;
          if (!form) {
            return;
          }
          await submitAddWoundDialog(form, actor, hitLocation);
        },
      },
      {
        action: "cancel",
        label: localize("RQG.Dialog.Common.btnCancel"),
        icon: "fas fa-times",
        callback: () => null,
      },
    ],
  });
}

function getEquippedArmorLayersForHitLocation(
  actor: RqgActor,
  hitLocation: HitLocationItem,
): ArmorLayerDialogData[] {
  const hitLocationRqid = hitLocation.flags?.rqg?.documentRqidFlags?.id;

  return actor.items.reduce<ArmorLayerDialogData[]>((layers, item) => {
    if (!isDocumentSubType<ArmorItem>(item, ItemTypeEnum.Armor)) {
      return layers;
    }

    const coversHitLocation = item.system.hitLocationRqidLinks.some(
      (link) => link.rqid === hitLocationRqid,
    );
    if (item.system.equippedStatus !== "equipped" || !coversHitLocation) {
      return layers;
    }

    layers.push({
      name: item.name,
      absorbs: item.system.absorbs ?? 0,
    });
    return layers;
  }, []);
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

            const formData = new foundry.applications.ux.FormDataExtended(form, {})
              .object as Record<string, FormDataEntryValue | null | undefined>;
            const healValue = Number(formData["heal"]);
            const persistedHealValue = Number.isFinite(healValue) && healValue > 0 ? healValue : 1;
            const healAllRequested = formData["healMode"] === "all";
            const selectedWoundValue = Number(formData["wound"]);
            const selectedWoundIndex =
              Number.isInteger(selectedWoundValue) && selectedWoundValue >= 0
                ? selectedWoundValue
                : 0;

            const currentHitLocation = actor.items.get(hitLocationItemId) as RqgItem | undefined;
            assertDocumentSubType<HitLocationItem>(currentHitLocation, ItemTypeEnum.HitLocation);

            // Avoid Foundry auto-rerender while animations run; we refresh manually below.
            delete (currentHitLocation.apps as Record<string, unknown>)[registeredDialogAppId];

            const healResult = await submitHealWoundDialog(form, actor, currentHitLocation);

            await animateHealWoundTransition(form, healResult);

            if (healAllRequested || !healResult.hasRemainingWounds) {
              await dialog.close({ submitted: true });
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
              persistedHealValue,
              formData["healMode"] === "all"
                ? localize("RQG.Item.HitLocation.HealWound.FeedbackHealedAll")
                : localize("RQG.Item.HitLocation.HealWound.FeedbackHealedSingle", {
                    healPoints: String(persistedHealValue),
                  }),
              Math.min(
                selectedWoundIndex,
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

async function submitAddWoundDialog(
  form: HTMLFormElement,
  actor: RqgActor,
  hitLocation: RqgItem,
): Promise<void> {
  assertDocumentSubType<HitLocationItem>(hitLocation, ItemTypeEnum.HitLocation);
  const data = new foundry.applications.ux.FormDataExtended(form, {}).object as Record<
    string,
    FormDataEntryValue | null | undefined
  >;
  const applyDamageToTotalHp: boolean = !!data["toTotalHp"];
  const subtractArmorPoints: boolean = !!data["subtractAP"];
  const selectedAp = Math.max(0, Number(data["selectedAp"] ?? 0));
  const damage = Number(data["damage"]);

  if (!Number.isFinite(damage) || damage < 0) {
    return;
  }

  const effectiveDamage = subtractArmorPoints ? Math.max(0, damage - selectedAp) : damage;

  await hitLocation.applyWound(effectiveDamage, {
    // Damage is pre-adjusted by selected AP from the dialog.
    subtractArmorPoints: false,
    applyDamageToTotalHp,
  });
}

function initializeAddWoundDialogUi(root: ParentNode): void {
  const damageInput = root.querySelector<HTMLInputElement>("#inflictDamagePoints");
  const subtractApInput = root.querySelector<HTMLInputElement>('input[name="subtractAP"]');
  const applyToTotalHpInput = root.querySelector<HTMLInputElement>('input[name="toTotalHp"]');
  const apAppliedValue = root.querySelector<HTMLElement>("#apAppliedValue");
  const selectedApLabel = root.querySelector<HTMLElement>("#selectedApLabel");
  const selectedApInput = root.querySelector<HTMLInputElement>("#selectedApInput");
  const effectiveDamageValue = root.querySelector<HTMLElement>("#effectiveDamageValue");
  const totalHpAppliedDamageValue = root.querySelector<HTMLElement>("#totalHpAppliedDamageValue");
  const totalHpAfterValue = root.querySelector<HTMLElement>("#totalHpAfterValue");
  const totalHpPreviewRow = root.querySelector<HTMLElement>("#totalHpPreviewRow");
  const apPreviewRow = root.querySelector<HTMLElement>(".ap-preview");
  const armorLayersRow = root.querySelector<HTMLElement>(".armor-layers-row");
  const armorLayerToggles = Array.from(
    root.querySelectorAll<HTMLInputElement>(".armor-layer-toggle"),
  );
  const summaryElement = root.querySelector<HTMLElement>(".add-wound-summary");
  const submitButton = root.querySelector<HTMLButtonElement>('button[data-action="submit"]');

  if (
    !damageInput ||
    !applyToTotalHpInput ||
    !totalHpAppliedDamageValue ||
    !totalHpAfterValue ||
    !totalHpPreviewRow ||
    !summaryElement
  ) {
    return;
  }

  const hitLocationAp = Number(summaryElement.dataset["hitLocationAp"] ?? 0);
  const actorCurrentHp = Number(summaryElement.dataset["actorCurrentHp"] ?? 0);
  const totalLayerAp = armorLayerToggles.reduce((sum, toggle) => {
    const absorbs = Number(toggle.dataset["absorbs"] ?? 0);
    return Number.isFinite(absorbs) ? sum + absorbs : sum;
  }, 0);
  const baseAp = Math.max(0, hitLocationAp - totalLayerAp);

  const setMasterFromLayerSelection = () => {
    if (!subtractApInput || armorLayerToggles.length === 0) {
      return;
    }
    const selectedCount = armorLayerToggles.filter((toggle) => toggle.checked).length;
    if (selectedCount === 0) {
      subtractApInput.checked = false;
      subtractApInput.indeterminate = false;
      return;
    }
    subtractApInput.checked = true;
    subtractApInput.indeterminate = selectedCount < armorLayerToggles.length;
  };

  const syncPreview = () => {
    const damage = Number(damageInput.value);
    const validDamage = Number.isFinite(damage) && damage >= 0;
    const enteredDamage = validDamage ? damage : 0;

    setMasterFromLayerSelection();

    const subtractApEnabled = Boolean(subtractApInput?.checked);
    armorLayersRow?.classList.toggle("is-muted", !subtractApEnabled);
    const selectedLayerAp = armorLayerToggles.reduce((sum, toggle) => {
      if (!toggle.checked) {
        return sum;
      }
      const absorbs = Number(toggle.dataset["absorbs"] ?? 0);
      return Number.isFinite(absorbs) ? sum + absorbs : sum;
    }, 0);

    const apApplied = subtractApEnabled ? baseAp + selectedLayerAp : 0;
    const effectiveDamage = Math.max(0, enteredDamage - apApplied);

    if (selectedApLabel) {
      selectedApLabel.textContent = apApplied.toString();
    }
    if (selectedApInput) {
      selectedApInput.value = apApplied.toString();
    }

    if (apAppliedValue) {
      apAppliedValue.textContent = apApplied.toString();
    }

    if (effectiveDamageValue) {
      effectiveDamageValue.textContent = effectiveDamage.toString();
      effectiveDamageValue.classList.toggle("is-positive", effectiveDamage > 0);
    }
    if (apPreviewRow && subtractApInput) {
      apPreviewRow.classList.toggle("is-muted", !subtractApEnabled);
    }

    const hpAppliedDamage = applyToTotalHpInput.checked ? effectiveDamage : 0;
    const totalHpAfter = Math.max(0, actorCurrentHp - hpAppliedDamage);
    totalHpAppliedDamageValue.textContent = hpAppliedDamage.toString();
    totalHpAfterValue.textContent = `${totalHpAfter}`;
    totalHpPreviewRow.classList.toggle("is-muted", !applyToTotalHpInput.checked);

    if (submitButton) {
      submitButton.disabled = !validDamage;
    }
  };

  window.setTimeout(() => {
    damageInput.focus();
  }, 0);
  damageInput.addEventListener("input", syncPreview);
  subtractApInput?.addEventListener("change", () => {
    if (!subtractApInput.checked) {
      subtractApInput.indeterminate = false;
      armorLayerToggles.forEach((toggle) => {
        toggle.checked = false;
      });
    } else {
      armorLayerToggles.forEach((toggle) => {
        toggle.checked = true;
      });
    }
    syncPreview();
  });
  armorLayerToggles.forEach((toggle) => {
    toggle.addEventListener("change", syncPreview);
  });
  applyToTotalHpInput.addEventListener("change", syncPreview);
  syncPreview();
}

async function submitHealWoundDialog(
  form: HTMLFormElement,
  actor: RqgActor,
  hitLocation: RqgItem,
): Promise<HealSubmitResult> {
  assertDocumentSubType<HitLocationItem>(hitLocation, ItemTypeEnum.HitLocation);
  const data = new foundry.applications.ux.FormDataExtended(form, {}).object as Record<
    string,
    FormDataEntryValue | null | undefined
  >;
  const healAllWounds: boolean = data["healMode"] === "all";
  const healWoundIndex: number = Number(data["wound"]);
  const healPoints: number = Number(data["heal"]);
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
    await waitForHealAnimation();
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
    await waitForHealAnimation();
    return;
  }

  if (result.woundReduced) {
    selectedOption.classList.add("is-healed-updated");
    await waitForHealAnimation();
  }
}

async function waitForHealAnimation(): Promise<void> {
  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, HEAL_WOUND_ANIMATION_MS);
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
