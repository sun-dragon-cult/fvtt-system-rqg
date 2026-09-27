import { localize } from "../util";
import type { SpellTargetConditionOp } from "../../active-effect/data-model/spell-effect.defs";

export type SpellTargetCondition = { path: string; op: SpellTargetConditionOp; value: string };
export type SpellTargetRule = { documentType: string; where: SpellTargetCondition[] };

/**
 * Every value a condition path reaches in `data`. `*` steps into each value of an object and a
 * trailing `[]` into each element of an array, e.g. `usage.*.combatManeuvers[].damageType`.
 */
export function resolvePathLeaves(data: unknown, path: string): unknown[] {
  let nodes: unknown[] = [data];
  for (const segment of path.split(".")) {
    const isArrayStep = segment.endsWith("[]");
    const key = isArrayStep ? segment.slice(0, -2) : segment;
    nodes = nodes.flatMap((node) => {
      if (node == null || typeof node !== "object") {
        return [];
      }
      const values = key === "*" ? Object.values(node) : [(node as Record<string, unknown>)[key]];
      return isArrayStep ? values.flatMap((v) => (Array.isArray(v) ? v : [])) : values;
    });
  }
  return nodes.filter((node) => node !== undefined);
}

function leafMatches(leaf: unknown, op: SpellTargetConditionOp, value: string): boolean {
  switch (op) {
    case "eq":
      return String(leaf) === value;
    case "ne":
      return String(leaf) !== value;
    case "gt":
      return Number(leaf) > Number(value);
    case "gte":
      return Number(leaf) >= Number(value);
    case "lt":
      return Number(leaf) < Number(value);
    case "lte":
      return Number(leaf) <= Number(value);
    case "in":
      return value
        .split(",")
        .map((v) => v.trim())
        .includes(String(leaf));
    case "includes":
      return Array.isArray(leaf) || typeof leaf === "string" ? leaf.includes(value) : false;
    case "nonEmpty":
      if (leaf == null || leaf === "") {
        return false;
      }
      return typeof leaf === "object" ? Object.keys(leaf).length > 0 : true;
  }
}

/** A condition holds when any value its path reaches matches. */
export function conditionHolds(data: unknown, condition: SpellTargetCondition): boolean {
  return resolvePathLeaves(data, condition.path).some((leaf) =>
    leafMatches(leaf, condition.op, condition.value),
  );
}

/** The target's items a spell effect could attach to, judged on their own `system` data only. */
export function findSpellTargetCandidates<T extends { type: string; system: unknown }>(
  items: Iterable<T>,
  rule: SpellTargetRule,
): T[] {
  return [...items].filter(
    (item) =>
      item.type === rule.documentType &&
      rule.where.every((condition) => conditionHolds(item.system, condition)),
  );
}

/**
 * The item to attach the effect to: the only candidate, or the one picked in a dialog. Run only on
 * the client that owns the target - listing a hostile target's items to anyone else would leak them.
 */
export async function chooseSpellTargetItem<T extends Item>(
  candidates: T[],
  spellName: string,
  optionLabel: (item: T) => string = (item) => item.name ?? "",
): Promise<T | undefined> {
  if (candidates.length <= 1) {
    return candidates[0];
  }
  const options = candidates
    .map(
      (item) =>
        `<option value="${item.id}">${foundry.utils.escapeHTML(optionLabel(item))}</option>`,
    )
    .join("");
  const itemId = await foundry.applications.api.DialogV2.prompt({
    window: { title: localize("RQG.ChatMessage.SpellCast.ChooseTargetTitle", { spellName }) },
    content: `<select name="itemId">${options}</select>`,
    ok: {
      label: "RQG.ChatMessage.SpellCast.ApplyEffect",
      callback: (_event: Event, button: HTMLButtonElement) =>
        (button.form?.elements.namedItem("itemId") as HTMLSelectElement | null)?.value,
    },
    rejectClose: false,
  });
  return candidates.find((item) => item.id === itemId);
}
