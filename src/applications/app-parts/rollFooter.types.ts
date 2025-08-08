import type { RollMode } from "../../chat/chatMessage.types";

export type RollFooterData = {
  totalChance: number;
  rollMode: RollMode; // read in onSubmit by checking the active class
};
