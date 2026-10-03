import {
  resistanceRequestRollerSide,
  resistanceRequestState,
} from "./resistance-request-chat-message.defs.ts";
import { enumChoices } from "../../data-model/shared/enum-choices";
import { spellTargetRulingState } from "../../data-model/shared/spell-cast-outcome.defs";
import { spellEffectSettledReasons } from "../../active-effect/data-model/spell-effect.defs";

const { ArrayField, BooleanField, NumberField, StringField, DocumentUUIDField, JSONField } =
  foundry.data.fields;

const resistanceRequestChatMessageSchema = {
  state: new StringField({
    blank: false,
    nullable: false,
    initial: resistanceRequestState[0],
    choices: enumChoices(resistanceRequestState, "RQG.ChatMessage.ResistanceRequest.State."),
  }),
  targetTokenOrActorUuid: new DocumentUUIDField({
    blank: false,
    nullable: false,
    required: true,
  }),
  // Which side the recipient supplies from their own sheet; the other side is frozen at send time.
  rollerSide: new StringField({
    blank: false,
    nullable: false,
    required: false,
    initial: resistanceRequestRollerSide[0],
    choices: enumChoices(
      resistanceRequestRollerSide,
      "RQG.Dialog.ResistanceRequest.RollerSideOptions.",
    ),
  }),
  // "" when the side is frozen, or is a manual value rather than an actor characteristic.
  activeCharacteristics: new StringField({ blank: true, nullable: false, required: false }),
  passiveCharacteristics: new StringField({ blank: true, nullable: false, required: false }),
  activeValue: new NumberField({ nullable: false, required: false, initial: 0 }),
  activeLabel: new StringField({ blank: true, nullable: false, required: false, initial: "" }),
  passiveValue: new NumberField({ nullable: false, required: true, initial: 0 }),
  passiveLabel: new StringField({ blank: true, nullable: false, required: true }),
  // Side's name (actor or GM-typed); the frozen side's feeds the "opposes X" flavor line.
  activeActorName: new StringField({
    blank: true,
    nullable: true,
    initial: undefined,
    required: false,
  }),
  passiveActorName: new StringField({
    blank: true,
    nullable: true,
    initial: undefined,
    required: false,
  }),
  // RAW p.242: the target may voluntarily and knowingly accept instead of resisting.
  allowVoluntaryAccept: new BooleanField({ nullable: false, required: false, initial: false }),
  // What the check is about, e.g. the spell being resisted.
  description: new StringField({
    blank: true,
    nullable: true,
    initial: undefined,
    required: false,
  }),
  // Set when the card also carries the spell cast that triggered it; the message flavor is then the
  // spell's, so the "opposes X / POW vs POW" lines move into the card body.
  castRoll: new JSONField({ blank: false, nullable: true, required: false, initial: undefined }),
  resistanceFlavor: new StringField({
    blank: true,
    nullable: false,
    required: false,
    initial: "",
  }),
  // A spell cast reads its outcome in terms of the spell taking effect, a GM request doesn't.
  isSpellCast: new BooleanField({ nullable: false, required: false, initial: false }),
  // The spell effects applied to the target from this card, so Apply only runs once.
  appliedEffectUuids: new ArrayField(new StringField({ blank: false, nullable: false })),
  // Set instead when Apply found the spell couldn't take effect on the target; "" otherwise.
  effectBlockedReason: new StringField({
    blank: true,
    nullable: false,
    required: false,
    initial: "",
    choices: ["", ...spellEffectSettledReasons],
  }),
  // A GM's override of whether the spell took effect; "" when none.
  gmRuling: new StringField({
    blank: true,
    nullable: false,
    required: false,
    initial: "",
    choices: ["", ...spellTargetRulingState],
  }),
  // The spell's own flavor, kept unwrapped so the message flavor can be rebuilt without its
  // concealment wrapper once the target is allowed to see what hit them.
  castFlavor: new StringField({ blank: true, nullable: false, required: false, initial: "" }),
  // The spell cast on a combined card, for getSpellCastOutcome.
  spellUuid: new StringField({ blank: true, nullable: false, required: false, initial: "" }),
  // A hidden cast's whispered spellCast message, whose outcome this anonymous card settles.
  spellCastMessageId: new StringField({
    blank: true,
    nullable: false,
    required: false,
    initial: "",
  }),
  // The caster, who is never concealed from - see spellHiddenFromUuid.
  spellCasterUuid: new StringField({ blank: true, nullable: false, required: false, initial: "" }),
  // Set to the target's uuid to conceal the spell's name and cast roll from them alone. Cleared
  // when the spell takes effect - they feel it land, so they learn what it was.
  spellHiddenFromUuid: new StringField({
    blank: true,
    nullable: false,
    required: false,
    initial: "",
  }),
  // GM's situational modifier; seeds the roller's Other modifier.
  otherModifier: new NumberField({ nullable: false, required: false, initial: 0 }),
  otherModifierDescription: new StringField({
    blank: true,
    nullable: true,
    initial: undefined,
    required: false,
  }),
  // GM's chosen roll mode; seeds the roller's selection.
  rollMode: new StringField({ blank: true, nullable: false, required: false, initial: "" }),
  resistanceRoll: new JSONField({
    blank: false,
    nullable: true,
    required: false,
    initial: undefined,
  }),
} as const;

type resistanceRequestDataType = typeof resistanceRequestChatMessageSchema;

export class ResistanceRequestChatMessageData extends foundry.abstract.TypeDataModel<
  resistanceRequestDataType,
  any
> {
  static override defineSchema() {
    return resistanceRequestChatMessageSchema;
  }
}
