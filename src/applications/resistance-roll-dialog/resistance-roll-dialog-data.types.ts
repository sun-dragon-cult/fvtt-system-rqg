import type { RollHeaderData } from "../app-parts/roll-header.types.ts";
import type { RollFooterData } from "../app-parts/roll-footer.types.ts";
import type { Characteristics } from "../../data-model/actor-data/characteristics.ts";

/** Sentinel value for the token/actor dropdown meaning "type in a value by hand instead". */
export const MANUAL_SOURCE_VALUE = "manual";

/** Prefill for one side (active or passive) of a resistance roll, e.g. from a spell's post-cast hook. */
export type ResistanceRollSidePrefill =
  | {
      source: "tokenOrActor";
      tokenOrActorUuid: string;
      characteristicNames: [keyof Characteristics] | [keyof Characteristics, keyof Characteristics];
    }
  | { source: "manual"; value: number; label: string };

export type ResistanceRollDialogPrefill = {
  active?: ResistanceRollSidePrefill;
  passive?: ResistanceRollSidePrefill;
  /** Shown in the roll header, e.g. the name of the spell that triggered this check. */
  description?: string;
};

export type ResistanceRollDialogContext = RollHeaderData &
  RollFooterData & {
    formData: ResistanceRollDialogFormData;

    speakerName: string;
    activeTokenOrActorOptions: SelectOptionData<string>[];
    passiveTokenOrActorOptions: SelectOptionData<string>[];
    characteristicOptions: SelectOptionData<string>[];
    augmentOptions: SelectOptionData<number>[];
    meditateOptions: SelectOptionData<number>[];
  };

export type ResistanceRollDialogFormData = {
  /** A token/actor uuid, or the MANUAL_SOURCE_VALUE sentinel. */
  activeTokenOrActorUuid: string;
  /** One characteristic name, or two joined by "+" (e.g. "strength+size"). */
  activeCharacteristics: string;
  activeManualLabel: string;
  activeManualValue: number;

  /** A token/actor uuid, or the MANUAL_SOURCE_VALUE sentinel. */
  passiveTokenOrActorUuid: string;
  /** One characteristic name, or two joined by "+" (e.g. "size+dexterity"). */
  passiveCharacteristics: string;
  passiveManualLabel: string;
  passiveManualValue: number;

  augmentModifier: string;
  meditateModifier: string;
  otherModifier: string;
  otherModifierDescription: string;

  actorUuid: string; // hidden field - the actor whose sheet/token this dialog was opened from
  tokenUuid: string; // hidden field
};
