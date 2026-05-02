export type RollFooterData = {
  totalChance: number;
  rollMode: foundry.dice.Roll.Mode; // read in onSubmit by checking the active class
};
