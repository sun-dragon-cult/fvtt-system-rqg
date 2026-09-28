import { localize } from "../system/util";
import { applySpellEffect } from "../system/spell-effects/apply-spell-effect";
import { compendiumSpellsWithEffects } from "../system/spell-effects/spells-with-effects";
import { ItemTypeEnum } from "@item-model/item-types.ts";
import type { RqgActor } from "@actors/rqg-actor.ts";
import type { RqgItem } from "@items/rqg-item.ts";

function hasVariableLevel(spell: RqgItem): boolean {
  const system = spell.system as { isVariable?: boolean; isStackable?: boolean };
  return spell.type === ItemTypeEnum.RuneMagic ? !!system.isStackable : !!system.isVariable;
}

function spellOptions(spells: RqgItem[], type: ItemTypeEnum, label: string): string {
  const options = spells
    .filter((spell) => spell.type === type)
    .map(
      (spell) =>
        `<option value="${spell.uuid}" data-level="${(spell.system as { points?: number }).points ?? 0}"` +
        ` data-variable="${hasVariableLevel(spell)}">${foundry.utils.escapeHTML(spell.name ?? "")}</option>`,
    )
    .join("");
  return options
    ? `<optgroup label="${foundry.utils.escapeHTML(label)}">${options}</optgroup>`
    : "";
}

/** Reset the level to the picked spell's points, editable only for a variable or stackable spell. */
function syncLevel(form: HTMLFormElement | null | undefined): void {
  const select = form?.elements.namedItem("spellUuid") as HTMLSelectElement | null | undefined;
  const level = form?.elements.namedItem("level") as HTMLInputElement | null | undefined;
  const option = select?.selectedOptions[0];
  if (!option || !level) {
    return;
  }
  level.value = option.dataset["level"] ?? "0";
  level.readOnly = option.dataset["variable"] !== "true";
}

/**
 * Let the GM put a spell effect on a token without casting the spell, e.g. one cast off-screen.
 * Stacking and durations work as for a cast; there is no caster.
 */
export async function addSpellEffectFromHud(actor: RqgActor, targetName: string): Promise<boolean> {
  const spells = await compendiumSpellsWithEffects();
  if (!spells.length) {
    ui.notifications?.warn(localize("RQG.TokenHud.NoSpellsWithEffects"));
    return false;
  }
  const content =
    `<div class="form-group"><label>${localize("RQG.TokenHud.AddSpellEffectSpell")}</label>` +
    `<select name="spellUuid">` +
    spellOptions(spells, ItemTypeEnum.SpiritMagic, localize("TYPES.Item.spiritMagic")) +
    spellOptions(spells, ItemTypeEnum.RuneMagic, localize("TYPES.Item.runeMagic")) +
    `</select></div>` +
    `<div class="form-group"><label>${localize("RQG.Foundry.ActiveEffect.SpellLevel")}</label>` +
    `<input type="number" name="level" min="0" step="1"></div>`;

  const picked = (await foundry.applications.api.DialogV2.input({
    window: { title: localize("RQG.TokenHud.AddSpellEffectTitle", { targetName }) },
    content: content,
    ok: { label: "RQG.TokenHud.AddSpellEffectButton", icon: "fas fa-plus" },
    render: (_event: Event, dialog: foundry.applications.api.DialogV2) => {
      const form = dialog.element.querySelector("form");
      syncLevel(form);
      form
        ?.querySelector("select[name=spellUuid]")
        ?.addEventListener("change", () => syncLevel(form));
    },
    rejectClose: false,
  } as any)) as { spellUuid?: string; level?: number } | null;

  const spell = spells.find((s) => s.uuid === picked?.spellUuid);
  if (!picked || !spell) {
    return false;
  }
  const applied = await applySpellEffect(spell, actor, targetName, {
    casterUuid: "",
    castMessageId: "",
    level: Math.max(0, Math.trunc(Number(picked.level) || 0)),
    magicPointsSpent: 0,
    runePointsSpent: 0,
    casterSuccessLevel: undefined,
  });
  return applied?.outcome === "applied";
}
