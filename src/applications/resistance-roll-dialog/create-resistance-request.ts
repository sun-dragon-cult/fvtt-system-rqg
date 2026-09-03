import { templatePaths } from "../../system/load-handlebars-templates";
import { activateChatTab } from "../../system/util";
import type { RqgActor } from "@actors/rqg-actor.ts";
import type {
  ResistanceRequestDataSourceData,
  ResistanceRequestRollerSide,
} from "../../chat/data-model/resistance-request-chat-message.types.ts";
import { buildResistanceRollFlavor } from "../../rolls/resistance-roll/resistance-roll-flavor.ts";
import { getSpeakerCompat } from "../../system/fvtt-type-compat";
import { resolveResistanceRequestVisibility } from "./resistance-roll-shared.ts";
import type { SpiritMagicRoll } from "../../rolls/spirit-magic-roll/spirit-magic-roll.ts";
import type { RuneMagicRoll } from "../../rolls/rune-magic-roll/rune-magic-roll.ts";

type SpellCastRoll = SpiritMagicRoll | RuneMagicRoll;

export type CreateResistanceRequestParams = {
  /** The addressed actor - always a real token/actor, never a manual value. */
  targetTokenOrActorUuid: string;
  rollerSide: ResistanceRequestRollerSide;
  /** Encoded characteristic(s) the recipient rolls, read live off their sheet. */
  rollerCharacteristics: string;
  /** The opposing side, snapshotted now. */
  frozenValue: number;
  frozenActorName?: string | undefined;
  /**
   * Encoded characteristic(s) the frozen side is putting up, "" for a Manual value. Only used to
   * spot a POW vs POW check, which earns the roller a POW gain roll outright (RQG p.418).
   */
  frozenCharacteristics?: string | undefined;
  /** The frozen side's token/actor, so it can speak the card when it is the active side. */
  frozenTokenOrActorUuid?: string | undefined;
  /** Labels for the flavor line, in RAW active-vs-passive order. */
  activeLabel: string;
  passiveLabel: string;
  otherModifier: number;
  otherModifierDescription?: string | undefined;
  rollMode: string;
  allowVoluntaryAccept: boolean;
  /** Phrases the outcome as the spell taking effect; false for a plain GM request. */
  isSpellCast?: boolean | undefined;
  /** What the check is about, e.g. the spell being resisted. */
  description?: string | undefined;
  /**
   * The spell cast that triggered this. Turns the card into the combined cast+resistance card:
   * spoken by the caster, flavored with the spell, and carrying the cast roll as its first row.
   */
  spellCast?:
    | {
        castRoll: SpellCastRoll;
        casterTokenOrActorUuid: string;
      }
    | undefined;
};

/** Post a resistance-table check as a chat card the recipient answers. Never rolls anything. */
export async function createResistanceRequest(
  params: CreateResistanceRequestParams,
): Promise<ChatMessage | undefined> {
  const rollerIsPassive = params.rollerSide === "passive";
  const spellCast = params.spellCast;

  // The active side speaks, like an attack card. A Manual hazard has a name but no document, so it
  // speaks through an alias; a concealed cast has neither and falls back to the recipient.
  const activeSideUuid = rollerIsPassive
    ? (spellCast?.casterTokenOrActorUuid ?? params.frozenTokenOrActorUuid ?? "")
    : params.targetTokenOrActorUuid;
  const speakerAlias = rollerIsPassive && !activeSideUuid ? params.frozenActorName : undefined;
  const speakerUuid = activeSideUuid || (speakerAlias ? "" : params.targetTokenOrActorUuid);

  const [speakerTokenOrActor, targetTokenOrActor] = await Promise.all([
    speakerUuid
      ? (fromUuid(speakerUuid) as Promise<TokenDocument | RqgActor | undefined>)
      : undefined,
    fromUuid(params.targetTokenOrActorUuid) as Promise<TokenDocument | RqgActor | undefined>,
  ]);

  const speakerToken =
    speakerTokenOrActor instanceof TokenDocument ? speakerTokenOrActor : undefined;
  const speakerActor = (
    speakerTokenOrActor instanceof TokenDocument ? speakerTokenOrActor.actor : speakerTokenOrActor
  ) as RqgActor | undefined;
  const targetActor = (
    targetTokenOrActor instanceof TokenDocument ? targetTokenOrActor.actor : targetTokenOrActor
  ) as RqgActor | undefined;

  // "opposes X" names the passive side, since the active side is the one speaking. The combined
  // card's message flavor already names the spell, so the body doesn't repeat it.
  const resistanceFlavor = buildResistanceRollFlavor(
    params.activeLabel,
    params.passiveLabel,
    rollerIsPassive ? (targetActor?.name ?? undefined) : params.frozenActorName,
    spellCast ? undefined : params.description,
  );

  const chatSystemData: ResistanceRequestDataSourceData = {
    state: "Requested",
    targetTokenOrActorUuid: params.targetTokenOrActorUuid,
    rollerSide: params.rollerSide,
    activeCharacteristics: rollerIsPassive
      ? (params.frozenCharacteristics ?? "")
      : params.rollerCharacteristics,
    passiveCharacteristics: rollerIsPassive
      ? params.rollerCharacteristics
      : (params.frozenCharacteristics ?? ""),
    activeValue: rollerIsPassive ? params.frozenValue : 0,
    activeLabel: params.activeLabel,
    passiveValue: rollerIsPassive ? 0 : params.frozenValue,
    passiveLabel: params.passiveLabel,
    activeActorName: rollerIsPassive ? params.frozenActorName : undefined,
    passiveActorName: rollerIsPassive ? undefined : params.frozenActorName,
    allowVoluntaryAccept: params.allowVoluntaryAccept,
    description: params.description,
    otherModifier: params.otherModifier,
    otherModifierDescription: params.otherModifierDescription,
    rollMode: params.rollMode,
    resistanceRoll: undefined,
    castRoll: spellCast ? spellCast.castRoll.toJSON() : undefined,
    resistanceFlavor: spellCast ? resistanceFlavor : "",
    // Only the target is kept in the dark - the rest of the table follows the cast as it would an
    // attack. "" on a standalone request, which has no spell to hide.
    castFlavor: spellCast ? spellCast.castRoll.flavor : "",
    spellCasterUuid: spellCast ? spellCast.casterTokenOrActorUuid : "",
    spellHiddenFromUuid: spellCast ? params.targetTokenOrActorUuid : "",
    isSpellCast: !!params.isSpellCast,
    outcomeDescription: "",
  };

  const content = await foundry.applications.handlebars.renderTemplate(
    templatePaths.resistanceRequestChatMessage,
    { ...chatSystemData },
  );

  // A combined card is only ever built for an open cast, so it stays public like an attack card -
  // the buttons are what's owner-gated, not the whole card.
  const { whisper, blind } = spellCast
    ? { whisper: [] as string[], blind: false }
    : resolveResistanceRequestVisibility(params.rollMode, targetActor, true);

  // The flavor sits outside the card body but still inside the message element, so the same
  // ownership gate reaches it - a concealed spell's name is hidden there too.
  const flavor = spellCast
    ? `<span data-hide-from-owner-uuid="${params.targetTokenOrActorUuid}" data-hide-unless-owner-uuid="${spellCast.casterTokenOrActorUuid}">${spellCast.castRoll.flavor}</span>`
    : resistanceFlavor;

  activateChatTab();
  const cm = await ChatMessage.create({
    type: "resistanceRequest",
    system: chatSystemData,
    flavor: flavor,
    content: content,
    speaker: getSpeakerCompat({
      actor: speakerActor ?? undefined,
      token: speakerToken,
      alias: speakerAlias,
    }),
    whisper: whisper,
    blind: blind,
  } as any);

  if (cm && !Array.isArray(cm)) {
    if (spellCast) {
      await game.dice3d?.showForRoll(spellCast.castRoll, game.user, true, null, false);
    }
    cm.render(true);
    return cm;
  }
  return undefined;
}
