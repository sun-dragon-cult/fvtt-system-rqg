import { ItemTypeEnum } from "@item-model/itemTypes.ts";
import type { ArmorItem } from "@item-model/armorDataModel.ts";
import type { HitLocationItem } from "@item-model/hitLocationDataModel.ts";
import type { RqgActor } from "@actors/rqgActor.ts";
import { assertDocumentSubType, isDocumentSubType, localize } from "../../system/util";
import { RqgItem } from "../rqgItem";
import { systemId } from "../../system/config";
import { templatePaths } from "../../system/loadHandlebarsTemplates";

type ArmorLayerDialogData = {
  name: string;
  absorbs: number;
};

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
          await applyAddWoundFormData(form, hitLocation);
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

async function applyAddWoundFormData(form: HTMLFormElement, hitLocation: RqgItem): Promise<void> {
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
