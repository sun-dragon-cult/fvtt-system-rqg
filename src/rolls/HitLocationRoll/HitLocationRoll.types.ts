import EvaluationOptions = RollTerm.EvaluationOptions;

import type { ChatSpeakerDataProperties } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/chatSpeakerData";

export type HitLocationName = {
  dieFrom: number;
  dieTo: number;
  name: string;
};

export type HitLocationRollOptions = Partial<EvaluationOptions> & {
  hitLocationNames: HitLocationName[];
  speaker?: ChatSpeakerDataProperties;
};
