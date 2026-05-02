type RollMode = foundry.dice.Roll.Mode;

function resolveRollMode(value: unknown): RollMode | undefined {
  if (typeof value !== "string" || value.length === 0) {
    return undefined;
  }

  const rollClass = Roll as unknown as {
    _mapLegacyRollMode?: (mode: string) => string;
  };

  const normalized =
    typeof rollClass._mapLegacyRollMode === "function"
      ? rollClass._mapLegacyRollMode(value)
      : value;

  return typeof normalized === "string" && normalized.length > 0
    ? (normalized as RollMode)
    : undefined;
}

export function getConfiguredRollModes(): RollMode[] {
  const chatMessageConfig = CONFIG.ChatMessage as unknown as {
    modes?: Record<string, unknown>;
  };
  const modes = chatMessageConfig.modes;
  if (!modes) {
    return [];
  }

  const resolved = [
    ...Object.keys(modes).map((key) => resolveRollMode(key)),
    ...Object.values(modes).map((value) => resolveRollMode(value)),
  ].filter((mode): mode is RollMode => mode !== undefined);

  return [...new Set(resolved)];
}

export function getDefaultRollMode(): RollMode {
  const fromSetting = resolveRollMode(game.settings?.get("core", "rollMode"));
  if (fromSetting) {
    return fromSetting;
  }

  const configuredModes = getConfiguredRollModes();
  if (configuredModes.length > 0) {
    return configuredModes[0]!;
  }

  return resolveRollMode("publicroll") ?? ("publicroll" as RollMode);
}

export function getSelectedRollMode(value: unknown): RollMode | undefined {
  const resolved = resolveRollMode(value);
  if (!resolved) {
    return undefined;
  }

  const configuredModes = getConfiguredRollModes();
  if (configuredModes.length === 0) {
    return resolved;
  }

  return configuredModes.includes(resolved) ? resolved : undefined;
}
