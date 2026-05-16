import type { RqgItem } from "@items/rqgItem.ts";

type ItemSystemModelLike = Record<string, unknown> & {
  _source?: Record<string, unknown>;
  schema?: {
    getField?: (
      path: string,
      options?: { source?: Record<string, unknown> | ItemSystemModelLike },
    ) => DataModelFieldLike | undefined;
  };
  getFieldForProperty?: (path: string) => DataModelFieldLike | undefined;
};

type DataModelFieldLike = {
  applyChange: (
    value: unknown,
    model: ItemSystemModelLike,
    change: ChangeDataWithType,
    options?: { replacementData?: Record<string, unknown> },
  ) => unknown;
};

type ChangeDataWithType = ActiveEffect.ChangeData & { type: string };

export type DataModelFieldChangeResult =
  | { applied: true; value: unknown }
  | { applied: false; reason: string; error?: unknown };

function isItemSystemModelLike(value: unknown): value is ItemSystemModelLike {
  return value !== null && typeof value === "object";
}

function getDataModelField(
  systemModel: ItemSystemModelLike,
  systemPath: string,
): DataModelFieldLike | undefined {
  // DataModel-first resolution mirrors Foundry's active effect flow.
  const byProperty = systemModel.getFieldForProperty?.(systemPath);
  if (byProperty && typeof byProperty.applyChange === "function") {
    return byProperty;
  }

  const schemaField = systemModel.schema?.getField?.(systemPath, {
    source: systemModel._source ?? systemModel,
  });
  if (schemaField && typeof schemaField.applyChange === "function") {
    return schemaField;
  }

  return undefined;
}

/**
 * Attempt to apply a change through an item's DataModel schema field.
 *
 * Returns `applied: false` when the path is unsupported or cannot be resolved,
 * so callers can safely fall back to compatibility behavior.
 */
export function applyItemChangeThroughDataModel(
  item: RqgItem,
  path: string,
  change: ActiveEffect.ChangeData,
  replacementData: Record<string, unknown>,
): DataModelFieldChangeResult {
  if (!path.startsWith("system.")) {
    return { applied: false, reason: "path-not-in-item-system" };
  }

  const systemPath = path.slice("system.".length);
  if (!systemPath) {
    return { applied: false, reason: "system-path-missing" };
  }

  const systemModelUnknown = item.system;
  if (!isItemSystemModelLike(systemModelUnknown)) {
    return { applied: false, reason: "item-system-schema-unavailable" };
  }
  const systemModel = systemModelUnknown;

  const field = getDataModelField(systemModel, systemPath);
  if (!field) {
    return { applied: false, reason: "field-unresolved" };
  }

  const currentValue = foundry.utils.getProperty(systemModel, systemPath);
  const addChange: ChangeDataWithType = {
    ...change,
    // RQG custom item-targeted effects are additive by design.
    type: "add",
  };

  try {
    const updatedValue = field.applyChange(currentValue, systemModel, addChange, {
      replacementData,
    });
    return { applied: true, value: updatedValue };
  } catch (error: unknown) {
    return { applied: false, reason: "field-apply-failed", error };
  }
}
