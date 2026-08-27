import type { RollHeaderData } from "../app-parts/roll-header.types.ts";

/**
 * Pre-fill for {@link ResistanceRequestDialogV2}, produced by `openResistanceRequest` from the
 * invoking UI surface + the GM's current target. `activeUuid` is always a player-owned
 * token/actor (whoever the request card is addressed to); `passiveUuid` may be any token/actor.
 */
export type ResistanceRequestSeed = {
  activeUuid?: string | undefined;
  passiveUuid?: string | undefined;
};

export type ResistanceRequestDialogContext = RollHeaderData & {
  formData: ResistanceRequestDialogFormData;
  activeTokenOrActorOptions: SelectOptionData<string>[];
  passiveTokenOrActorOptions: SelectOptionData<string>[];
  characteristicOptions: SelectOptionData<string>[];
  augmentOptions: SelectOptionData<number>[];
  meditateOptions: SelectOptionData<number>[];
  totalChance: number;
};

export type ResistanceRequestDialogFormData = {
  /** The actor/token who will be asked to roll - always a real actor, never manual. */
  targetTokenOrActorUuid: string;
  /** One characteristic name, or two joined by "+" (e.g. "strength+size") - what they roll. */
  activeCharacteristics: string;

  /** A token/actor uuid, or the MANUAL_SOURCE_VALUE sentinel. */
  passiveTokenOrActorUuid: string;
  passiveCharacteristics: string;
  /** Only used for a Manual passive - names the obstacle/disease, e.g. "Noxious Gas". */
  passiveManualName: string;
  passiveManualLabel: string;
  passiveManualValue: number;

  // Prefilled defaults for the recipient's modifiers - they can still change them before rolling.
  augmentModifier: string;
  meditateModifier: string;
  otherModifier: string;
  otherModifierDescription: string;
};
