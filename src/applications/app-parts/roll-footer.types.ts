export type RollModeOption = {
  id: foundry.dice.Roll.Mode;
  label: string;
  icon: string;
};

export type RollFooterData = {
  totalChance: number;
  totalChanceTooltip?: string;
  rollMode: foundry.dice.Roll.Mode; // read in onSubmit by checking aria-pressed state
  rollModes: RollModeOption[];
};
