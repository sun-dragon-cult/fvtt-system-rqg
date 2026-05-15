type CustomChangeTargetType = "boolean" | "number" | "string" | "Array" | string;

function replaceDataRefs(raw: unknown, replacementData: Record<string, unknown>): unknown {
  if (typeof raw !== "string") {
    return raw;
  }

  const replaceFormulaData = (globalThis as any).Roll?.defaultImplementation?.replaceFormulaData;
  if (typeof replaceFormulaData !== "function") {
    return raw;
  }

  return replaceFormulaData(raw, replacementData, { recursive: true, warn: true });
}

export function castCustomChangeDelta(
  raw: unknown,
  targetType: CustomChangeTargetType,
  replacementData: Record<string, unknown> = {},
): unknown {
  const resolvedRaw = replaceDataRefs(raw, replacementData);
  switch (targetType) {
    case "boolean":
      return !!resolvedRaw;
    case "number":
      return Number(resolvedRaw) || 0;
    case "string":
      return String(resolvedRaw);
    default:
      return resolvedRaw;
  }
}

export function castCustomChangeArray(
  raw: unknown,
  innerType: Exclude<CustomChangeTargetType, "Array">,
  replacementData: Record<string, unknown> = {},
): unknown[] {
  const values = Array.isArray(raw) ? raw : [raw];
  return values.map((value) => castCustomChangeDelta(value, innerType, replacementData));
}
