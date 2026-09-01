import type { RollHeaderData } from "../app-parts/roll-header.types.ts";
import type { RollFooterData } from "../app-parts/roll-footer.types.ts";

/** Canvas-derived seed for {@link ResistanceRequestDialogV2}: `activeUuid` is always player-owned. */
export type ResistanceRequestSeed = {
  activeUuid?: string | undefined;
  passiveUuid?: string | undefined;
};

export type ResistanceRequestDialogContext = RollHeaderData &
  Pick<RollFooterData, "rollMode" | "rollModes"> & {
    formData: ResistanceRequestDialogFormData;
    activeTokenOrActorOptions: SelectOptionData<string>[];
    passiveTokenOrActorOptions: SelectOptionData<string>[];
    characteristicOptions: SelectOptionData<string>[];
    totalChance: number;
    totalChanceTooltip?: string;
    /** Disables the Send button while a side is unresolved. */
    canSendRequest: boolean;
  };

export type ResistanceRequestDialogFormData = {
  /** Who is asked to roll - always a real actor, never manual. */
  targetTokenOrActorUuid: string;
  /** One characteristic name, or two joined by "+" (e.g. "strength+size"). */
  activeCharacteristics: string;

  /** A token/actor uuid, or the MANUAL_SOURCE_VALUE sentinel. */
  passiveTokenOrActorUuid: string;
  passiveCharacteristics: string;
  /** Only used for a Manual passive - names the obstacle/disease, e.g. "Noxious Gas". */
  passiveManualName: string;
  passiveManualLabel: string;
  passiveManualValue: number;

  // GM's situational modifier; seeds the roller's Other modifier.
  otherModifier: string;
  otherModifierDescription: string;
};
