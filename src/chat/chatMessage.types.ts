import type { DICE_ROLL_MODES } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/constants.mjs";
export type RollMode = (typeof DICE_ROLL_MODES)[keyof typeof DICE_ROLL_MODES];
