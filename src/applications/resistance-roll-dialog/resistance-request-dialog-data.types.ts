import type { RollHeaderData } from "../app-parts/roll-header.types.ts";
import type { RollFooterData } from "../app-parts/roll-footer.types.ts";
import type { ResistanceRequestRollerSide } from "../../chat/data-model/resistance-request-chat-message.types.ts";

/** Canvas-derived seed for {@link ResistanceRequestDialogV2}: the roller side is always player-owned. */
export type ResistanceRequestSeed = {
  activeUuid?: string | undefined;
  passiveUuid?: string | undefined;
  rollerSide?: ResistanceRequestRollerSide | undefined;
};

export type ResistanceRequestDialogContext = RollHeaderData &
  Pick<RollFooterData, "rollMode" | "rollModes" | "totalChance" | "totalChanceTooltip"> & {
    formData: ResistanceRequestDialogFormData;
    activeTokenOrActorOptions: SelectOptionData<string>[];
    passiveTokenOrActorOptions: SelectOptionData<string>[];
    characteristicOptions: SelectOptionData<string>[];
    rollerSideOptions: SelectOptionData<string>[];
    /** Which fieldset offers the Manual entry - the one the recipient doesn't supply. */
    activeIsManualCapable: boolean;
    passiveIsManualCapable: boolean;
    /** Disables the Send button while a side is unresolved. */
    canSendRequest: boolean;
  };

export type ResistanceRequestDialogFormData = {
  /** Which side the recipient supplies; the other side is frozen when the request is sent. */
  rollerSide: ResistanceRequestRollerSide;

  /** A token/actor uuid, or the MANUAL_SOURCE_VALUE sentinel when this side isn't the recipient's. */
  activeTokenOrActorUuid: string;
  /** One characteristic name, or two joined by "+" (e.g. "strength+size"). */
  activeCharacteristics: string;
  /** Only used for a Manual side - names the obstacle/poison, e.g. "Noxious Gas". */
  activeManualName: string;
  activeManualLabel: string;
  activeManualValue: number;

  passiveTokenOrActorUuid: string;
  passiveCharacteristics: string;
  passiveManualName: string;
  passiveManualLabel: string;
  passiveManualValue: number;

  // GM's situational modifier; always belongs to the active side.
  otherModifier: string;
  otherModifierDescription: string;
};
