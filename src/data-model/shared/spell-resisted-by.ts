import type { RqgActor } from "@actors/rqg-actor.ts";
import { localize } from "../../system/util";
import { AbilitySuccessLevelEnum } from "../../rolls/ability-roll/ability-roll.defs";
import { SpellResistedByEnum } from "../item-data/spell";
import {
  canChooseSpellCastRollMode,
  getDefaultRollMode,
  isHiddenRollMode,
} from "../../applications/app-parts/roll-mode";
import type { SpiritMagicRoll } from "../../rolls/spirit-magic-roll/spirit-magic-roll";
import type { RuneMagicRoll } from "../../rolls/rune-magic-roll/rune-magic-roll";
import { templatePaths } from "../../system/load-handlebars-templates";
import { buildCastTargetOutcomes, type SpellCastTarget } from "./spell-cast-outcome";

/** Outcome of the pre-cast target check, threaded to {@link postSpellCastResult}. */
export type ResistedSpellTarget = {
  proceed: boolean;
  targetTokenUuid?: string | undefined;
  /** The caster is the target, which counts as accepting - no resistance roll. */
  selfCast: boolean;
  /** Every token targeted when the spell was cast, whatever the resistedBy mode. */
  targets: SpellCastTarget[];
};

/**
 * Pre-cast target check for a resisted spell, run before any points are spent. Unresisted spells
 * pass straight through - targeting is only constrained where a resistance roll depends on it -
 * but their targets are still recorded for the cast outcome.
 */
export async function resolveResistedSpellCastTarget(
  resistedBy: SpellResistedByEnum,
  casterActor: RqgActor,
  spellName: string | undefined,
): Promise<ResistedSpellTarget> {
  const targets = [...(game.user?.targets ?? [])];
  const castTargets: SpellCastTarget[] = targets.flatMap((token) =>
    token.document?.uuid
      ? [
          {
            tokenUuid: token.document.uuid,
            isCaster: token.document.actor?.uuid === casterActor.uuid,
          },
        ]
      : [],
  );

  if (resistedBy !== SpellResistedByEnum.ResistanceRoll) {
    return { proceed: true, selfCast: false, targets: castTargets };
  }

  if (targets.length > 1) {
    ui.notifications?.warn(
      localize("RQG.Notification.Warn.ResistedSpellSingleTargetOnly", {
        spellName: spellName ?? "",
      }),
    );
    return { proceed: false, selfCast: false, targets: castTargets };
  }

  if (targets.length === 0) {
    const castOnSelf = await foundry.applications.api.DialogV2.confirm({
      window: { title: localize("RQG.Dialog.ResistanceRequest.CastOnSelfTitle") },
      content: localize("RQG.Dialog.ResistanceRequest.CastOnSelfContent", {
        spellName: spellName ?? "",
      }),
      yes: { label: "RQG.Dialog.ResistanceRequest.CastOnSelf", icon: "fa-solid fa-user" },
      no: { label: "COMMON.Cancel", icon: "fa-solid fa-xmark", default: true },
    });
    return { proceed: !!castOnSelf, selfCast: !!castOnSelf, targets: castTargets };
  }

  const targetToken = targets[0]?.document;
  return {
    proceed: true,
    targetTokenUuid: targetToken?.uuid ?? undefined,
    selfCast: targetToken?.actor?.uuid === casterActor.uuid,
    targets: castTargets,
  };
}

/**
 * Posts the cast roll to chat, in one of three shapes:
 *
 * - unresisted, failed or self-cast: a `spellCast` message carrying the roll and its outcome;
 * - resisted and open: one combined card carrying the cast roll, the target's Resist/Accept and
 *   their resistance roll, the way an attack card carries attack and defence. The spell's name and
 *   cast roll are concealed from everyone but the caster, so the target chooses without knowing
 *   whether an ally is healing them or an enemy is not;
 * - resisted and hidden (GM only): the `spellCast` message whispered per its mode, plus a bare
 *   request card naming neither the caster nor the spell - the target knows they are being tested,
 *   nothing more. The request links back to the cast message, which it settles.
 *
 * Only `ResistanceRoll` has a resolution step; the area / per-target / spirit-combat modes leave
 * their targets pending for a GM ruling on the cast card.
 */
export async function postSpellCastResult(params: {
  target: ResistedSpellTarget;
  resistedBy: SpellResistedByEnum;
  castRoll: SpiritMagicRoll | RuneMagicRoll;
  casterActor: RqgActor;
  casterToken: TokenDocument | null | undefined;
  spellUuid: string;
}): Promise<void> {
  const { target, resistedBy, castRoll, casterActor, casterToken, spellUuid } = params;
  // Only a GM can hide a cast; a player's always posts a card the whole table can follow.
  const castRollMode = canChooseSpellCastRollMode()
    ? (castRoll.options.rollMode ?? getDefaultRollMode())
    : ("public" as foundry.dice.Roll.Mode);
  castRoll.options.rollMode = castRollMode;

  const willBeResisted =
    resistedBy === SpellResistedByEnum.ResistanceRoll &&
    castRoll.successLevel != null &&
    castRoll.successLevel <= AbilitySuccessLevelEnum.Success &&
    !target.selfCast &&
    !!target.targetTokenUuid;

  const casterUuid = casterToken?.uuid ?? casterActor.uuid ?? "";
  const postCastMessage = async () =>
    castRoll.postToChat({
      type: "spellCast",
      content: await foundry.applications.handlebars.renderTemplate(
        templatePaths.spellCastChatMessage,
        {},
      ),
      system: {
        spellUuid: spellUuid,
        casterTokenOrActorUuid: casterUuid,
        castSuccessLevel: castRoll.successLevel ?? null,
        targets: buildCastTargetOutcomes({
          castSuccessLevel: castRoll.successLevel ?? AbilitySuccessLevelEnum.Fumble,
          resistedBy: resistedBy,
          targets: target.targets,
          casterTokenOrActorUuid: casterUuid,
        }),
      },
    });

  if (!willBeResisted) {
    await postCastMessage();
    return;
  }

  // Dynamic imports to avoid a circular dependency through rqgItem.ts.
  const [{ createResistanceRequest }, { resolveCharacteristicSide }] = await Promise.all([
    import("../../applications/resistance-roll-dialog/create-resistance-request"),
    import("../../applications/resistance-roll-dialog/resistance-roll-shared"),
  ]);

  const caster = resolveCharacteristicSide(casterUuid, "power", "", 0, "");
  const hidden = isHiddenRollMode(castRollMode);

  const castMessage = hidden ? await postCastMessage() : undefined;

  await createResistanceRequest({
    targetTokenOrActorUuid: target.targetTokenUuid!,
    rollerSide: "passive",
    rollerCharacteristics: "power",
    frozenValue: caster.value,
    frozenCharacteristics: "power",
    // A hidden cast gives the target nothing to identify who or what is testing them, so the
    // caster neither names nor speaks the card.
    frozenActorName: hidden ? undefined : caster.actorName,
    frozenTokenOrActorUuid: hidden ? undefined : casterUuid,
    activeLabel: caster.label,
    passiveLabel: caster.label,
    otherModifier: 0,
    // "self" would hide the request from the very person who has to answer it.
    rollMode: hidden ? (castRollMode === "blind" ? "blind" : "gm") : "public",
    allowVoluntaryAccept: true,
    isSpellCast: true,
    // Would leak the spell's name as the responder dialog's title.
    description: undefined,
    spellCast: hidden
      ? undefined
      : {
          castRoll: castRoll,
          casterTokenOrActorUuid: casterUuid,
          spellUuid: spellUuid,
        },
    spellCastMessageId: castMessage?.id ?? undefined,
  });
}
