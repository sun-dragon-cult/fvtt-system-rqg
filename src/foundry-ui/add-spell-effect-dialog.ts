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

/** Show only the spells whose name contains the search text, keeping a visible one selected. */
function filterSpells(form: HTMLFormElement, search: string): void {
  const select = form.elements.namedItem("spellUuid") as HTMLSelectElement | null;
  if (!select) {
    return;
  }
  const term = search.trim().toLocaleLowerCase();
  for (const option of select.options) {
    option.hidden = !!term && !option.text.toLocaleLowerCase().includes(term);
  }
  for (const group of select.querySelectorAll("optgroup")) {
    group.hidden = [...group.querySelectorAll("option")].every((option) => option.hidden);
  }
  if (!select.selectedOptions[0] || select.selectedOptions[0].hidden) {
    const firstVisible = [...select.options].find((option) => !option.hidden);
    select.value = firstVisible?.value ?? "";
    syncLevel(form);
  }
}

/** Step the selection to the next or previous visible spell. */
function moveSelection(form: HTMLFormElement, step: 1 | -1): void {
  const select = form.elements.namedItem("spellUuid") as HTMLSelectElement | null;
  const visible = [...(select?.options ?? [])].filter((option) => !option.hidden);
  const current = visible.findIndex((option) => option.selected);
  const next = visible[Math.min(Math.max(current + step, 0), visible.length - 1)];
  if (select && next) {
    select.value = next.value;
    next.scrollIntoView({ block: "nearest" });
    syncLevel(form);
  }
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
    `<div class="rqg-add-spell-effect-search">` +
    `<input type="search" name="search" autofocus` +
    ` placeholder="${foundry.utils.escapeHTML(localize("RQG.TokenHud.AddSpellEffectSearch"))}">` +
    `<select name="spellUuid" size="12" tabindex="-1"` +
    ` aria-label="${foundry.utils.escapeHTML(localize("RQG.TokenHud.AddSpellEffectSpell"))}">` +
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
      if (!form) {
        return;
      }
      filterSpells(form, "");
      const select = form.elements.namedItem("spellUuid") as HTMLSelectElement;
      const search = form.elements.namedItem("search") as HTMLInputElement;
      // Focus stays in the search field: Chromium greys a focused list's selected text whatever
      // the CSS says, so a click selects without focusing the list and the arrow keys step it.
      select.addEventListener("mousedown", (event) => {
        const option = (event.target as HTMLElement).closest("option");
        if (option) {
          event.preventDefault();
          select.value = option.value;
          syncLevel(form);
        }
      });
      select.addEventListener("dblclick", () =>
        form.requestSubmit(form.querySelector<HTMLButtonElement>("button[data-action=ok]")),
      );
      search.addEventListener("input", () => filterSpells(form, search.value));
      search.addEventListener("keydown", (event) => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          moveSelection(form, event.key === "ArrowDown" ? 1 : -1);
        }
      });
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
  // A cancellation or a spell macro (e.g. Dispel Magic) removes effects, so the palette changes then too.
  return (
    applied?.outcome === "applied" ||
    applied?.outcome === "resolved" ||
    (applied?.outcome === "blocked" && applied.reason === "cancelledActive")
  );
}
