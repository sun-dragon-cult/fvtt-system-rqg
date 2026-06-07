type RollMode = foundry.dice.Roll.Mode;

export type RollModeOption = {
  id: RollMode;
  label: string;
  icon: string;
};

function resolveRollMode(value: unknown): RollMode | undefined {
  return typeof value === "string" && value.length > 0 ? (value as RollMode) : undefined;
}

export function getConfiguredRollModes(): RollMode[] {
  const chatMessageConfig = CONFIG.ChatMessage as unknown as {
    modes?: Record<string, unknown>;
  };
  const modes = chatMessageConfig.modes;
  if (!modes) {
    return [];
  }

  const resolved = Object.keys(modes)
    .map((key) => resolveRollMode(key))
    .filter((mode): mode is RollMode => mode !== undefined);

  return [...new Set(resolved)];
}

export function getConfiguredRollModeOptions(): RollModeOption[] {
  const chatMessageConfig = CONFIG.ChatMessage as unknown as {
    modes?: Record<string, { label?: string; icon?: string }>;
  };
  const modes = chatMessageConfig.modes;
  if (!modes) {
    return [];
  }

  const options: RollModeOption[] = [];
  for (const [modeKey, modeConfig] of Object.entries(modes)) {
    const id = resolveRollMode(modeKey);
    if (!id) {
      continue;
    }

    options.push({
      id,
      label: modeConfig?.label ?? "",
      icon: modeConfig?.icon ?? "",
    });
  }

  return options;
}

export function getDefaultRollMode(): RollMode {
  const fromMessageMode = resolveRollMode((game.settings as any)?.get("core", "messageMode"));
  if (fromMessageMode) {
    return fromMessageMode;
  }

  const configuredModes = getConfiguredRollModes();
  if (configuredModes.length > 0) {
    return configuredModes[0]!;
  }

  return resolveRollMode("public") ?? ("public" as RollMode);
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

export function getSelectedRollModeFromClickEvent(event: MouseEvent): RollMode | undefined {
  const target = event.target;
  if (!(target instanceof Element)) {
    return undefined;
  }

  const elementWithRollMode = target.closest<HTMLElement>("[data-roll-mode]");
  return getSelectedRollMode(elementWithRollMode?.dataset["rollMode"]);
}
