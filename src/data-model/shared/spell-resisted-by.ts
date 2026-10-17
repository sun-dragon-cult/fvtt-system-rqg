import type { RqgActor } from "@actors/rqg-actor.ts";
import { localize } from "../../system/util";
import { AbilitySuccessLevelEnum } from "../../rolls/ability-roll/ability-roll.defs";
import { isSpiritCombatGate, SpellResistedByEnum, SpellResistedWithEnum } from "../item-data/spell";
import {
  canChooseSpellCastRollMode,
  getDefaultRollMode,
  isHiddenRollMode,
} from "../../applications/app-parts/roll-mode";
import type { SpiritMagicRoll } from "../../rolls/spirit-magic-roll/spirit-magic-roll";
import type { RuneMagicRoll } from "../../rolls/rune-magic-roll/rune-magic-roll";
import type { CreateResistanceRequestParams } from "../../applications/resistance-roll-dialog/create-resistance-request";
import { templatePaths } from "../../system/load-handlebars-templates";
import {
  areaResistanceThreshold,
  buildCastTargetOutcomes,
  type AreaResistance,
  type SpellCastTarget,
} from "./spell-cast-outcome";

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
 * pass straight through - targeting is only constrained where a resistance roll or spirit combat
 * depends on it - but their targets are still recorded for the cast outcome.
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

  const proceed: ResistedSpellTarget = { proceed: true, selfCast: false, targets: castTargets };
  const spiritCombat = isSpiritCombatGate(resistedBy);
  const perTarget = resistedBy === SpellResistedByEnum.ResistanceRollPerTarget;
  if (resistedBy !== SpellResistedByEnum.ResistanceRoll && !spiritCombat && !perTarget) {
    return proceed;
  }

  if (targets.length > 1 && !perTarget) {
    ui.notifications?.warn(
      localize("RQG.Notification.Warn.ResistedSpellSingleTargetOnly", {
        spellName: spellName ?? "",
      }),
    );
    return { proceed: false, selfCast: false, targets: castTargets };
  }

  if (spiritCombat) {
    return proceed;
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

  if (perTarget) {
    return proceed;
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
 * Posts the cast roll to chat, in one of five shapes:
 *
 * - unresisted, failed or self-cast: a `spellCast` message carrying the roll and its outcome;
 * - resisted and open: one combined card carrying the cast roll, the target's Resist/Accept and
 *   their resistance roll, the way an attack card carries attack and defence. The spell's name and
 *   cast roll are concealed from everyone but the caster, so the target chooses without knowing
 *   whether an ally is healing them or an enemy is not;
 * - resisted and hidden (GM only): the `spellCast` message whispered per its mode, plus a bare
 *   request card naming neither the caster nor the spell - the target knows they are being tested,
 *   nothing more. The request links back to the cast message, which it settles;
 * - resisted per target: the `spellCast` message, plus one request card per target linked back to
 *   it, as for a hidden cast. An open cast's requests name the caster, whose card names the spell.
 *
 * - resisted by area: the `spellCast` message, its targets settled at once by one resistance roll
 *   the caster makes, which the card reads as the highest value it overcomes.
 *
 * The spirit-combat modes leave their targets pending for a GM ruling on the cast card, which
 * `settleSpellCastTarget` records.
 */
export async function postSpellCastResult(params: {
  target: ResistedSpellTarget;
  resistedBy: SpellResistedByEnum;
  resistedWith: SpellResistedWithEnum;
  castRoll: SpiritMagicRoll | RuneMagicRoll;
  casterActor: RqgActor;
  casterToken: TokenDocument | null | undefined;
  spellUuid: string;
}): Promise<void> {
  const { target, resistedBy, resistedWith, castRoll, casterActor, casterToken, spellUuid } =
    params;
  // Only a GM can hide a cast; a player's always posts a card the whole table can follow.
  const castRollMode = canChooseSpellCastRollMode()
    ? (castRoll.options.rollMode ?? getDefaultRollMode())
    : ("public" as foundry.dice.Roll.Mode);
  castRoll.options.rollMode = castRollMode;

  const castSucceeded =
    castRoll.successLevel != null && castRoll.successLevel <= AbilitySuccessLevelEnum.Success;
  const resistedTargetUuids = castSucceeded ? resistingTargets(resistedBy, target) : [];

  const casterUuid = casterToken?.uuid ?? casterActor.uuid ?? "";
  const area =
    resistedBy === SpellResistedByEnum.ResistanceRollArea && castSucceeded && target.targets.length
      ? await rollAreaResistance(casterUuid, resistedWith, target.targets, castRollMode)
      : undefined;
  const postCastMessage = async () =>
    castRoll.postToChat({
      type: "spellCast",
      content: await foundry.applications.handlebars.renderTemplate(
        templatePaths.spellCastChatMessage,
        { areaResistanceText: area ? areaResistanceText(area.resistance, area.statLabel) : "" },
      ),
      system: {
        spellUuid: spellUuid,
        casterTokenOrActorUuid: casterUuid,
        castSuccessLevel: castRoll.successLevel ?? null,
        resistedBy: resistedBy,
        targets: buildCastTargetOutcomes({
          castSuccessLevel: castRoll.successLevel ?? AbilitySuccessLevelEnum.Fumble,
          resistedBy: resistedBy,
          targets: target.targets,
          casterTokenOrActorUuid: casterUuid,
          areaResistance: area?.resistance,
        }),
      },
    });

  if (!resistedTargetUuids.length) {
    await postCastMessage();
    return;
  }

  const hidden = isHiddenRollMode(castRollMode);
  // Only an open single-target cast gets the combined card, which carries the cast roll itself.
  const combined = !hidden && resistedBy === SpellResistedByEnum.ResistanceRoll;
  const castMessage = combined ? undefined : await postCastMessage();
  // One at a time, so the request cards follow the targets' order in chat
  for (const targetUuid of resistedTargetUuids) {
    await requestSpellResistance({
      targetUuid: targetUuid,
      casterUuid: casterUuid,
      resistedWith: resistedWith,
      rollMode: castRollMode,
      spellCast: combined ? { castRoll, casterTokenOrActorUuid: casterUuid, spellUuid } : undefined,
      spellCastMessageId: castMessage?.id ?? undefined,
    });
  }
}

/** Who a successful cast asks for a resistance roll: each target, or the single one. */
function resistingTargets(resistedBy: SpellResistedByEnum, target: ResistedSpellTarget): string[] {
  if (resistedBy === SpellResistedByEnum.ResistanceRollPerTarget) {
    return target.targets.filter((t) => !t.isCaster).map((t) => t.tokenUuid);
  }
  if (
    resistedBy === SpellResistedByEnum.ResistanceRoll &&
    !target.selfCast &&
    target.targetTokenUuid
  ) {
    return [target.targetTokenUuid];
  }
  return [];
}

/**
 * Ask a spell's target for a resistance roll against the caster's POW - when the spell is cast,
 * or when Reflection sends it back at its caster.
 */
export async function requestSpellResistance(params: {
  targetUuid: string;
  casterUuid: string;
  resistedWith: SpellResistedWithEnum;
  rollMode: string;
  /** The caster's POW when they cast it; their POW now when left out. */
  frozenValue?: number;
  spellCast?: CreateResistanceRequestParams["spellCast"];
  spellCastMessageId?: string | undefined;
  reflectedFrom?: CreateResistanceRequestParams["reflectedFrom"];
}): Promise<void> {
  // Dynamic imports to avoid a circular dependency through rqgItem.ts.
  const [{ createResistanceRequest }, { resolveCharacteristicSide, resolveCharacteristicLabel }] =
    await Promise.all([
      import("../../applications/resistance-roll-dialog/create-resistance-request"),
      import("../../applications/resistance-roll-dialog/resistance-roll-shared"),
    ]);
  const caster = resolveCharacteristicSide(params.casterUuid, "power", "", 0, "");
  const hidden = isHiddenRollMode(params.rollMode as foundry.dice.Roll.Mode);
  await createResistanceRequest({
    targetTokenOrActorUuid: params.targetUuid,
    rollerSide: "passive",
    rollerCharacteristics: params.resistedWith,
    frozenValue: params.frozenValue ?? caster.value,
    frozenCharacteristics: "power",
    // A hidden cast gives the target nothing to identify who or what is testing them, so the
    // caster neither names nor speaks the card.
    frozenActorName: hidden ? undefined : caster.actorName,
    frozenTokenOrActorUuid: hidden ? undefined : params.casterUuid,
    activeLabel: caster.label,
    passiveLabel: resolveCharacteristicLabel(params.resistedWith),
    otherModifier: 0,
    // "self" would hide the request from the very person who has to answer it.
    rollMode: hidden ? (params.rollMode === "blind" ? "blind" : "gm") : "public",
    allowVoluntaryAccept: true,
    isSpellCast: true,
    // Would leak the spell's name as the responder dialog's title.
    description: undefined,
    spellCast: params.spellCast,
    spellCastMessageId: params.spellCastMessageId,
    reflectedFrom: params.reflectedFrom,
  });
}

/** The single resistance roll of an area spell, and what the caster and each target put up. */
async function rollAreaResistance(
  casterUuid: string,
  resistedWith: SpellResistedWithEnum,
  targets: SpellCastTarget[],
  rollMode: foundry.dice.Roll.Mode,
): Promise<{ resistance: AreaResistance; statLabel: string }> {
  // Dynamic import to avoid a circular dependency through rqgItem.ts.
  const { resolveActorFromUuid, resolveCharacteristicLabel, resolveCharacteristicValue } =
    await import("../../applications/resistance-roll-dialog/resistance-roll-shared");
  const roll = await new foundry.dice.Roll("1d100").evaluate();
  if (!isHiddenRollMode(rollMode)) {
    await game.dice3d?.showForRoll(roll, game.user, true, null, false);
  }
  const casterActor = resolveActorFromUuid(casterUuid);
  const targetValues: Record<string, number> = {};
  for (const target of targets) {
    const actor = resolveActorFromUuid(target.tokenUuid);
    if (actor) {
      targetValues[target.tokenUuid] = resolveCharacteristicValue(actor, resistedWith);
    }
  }
  return {
    resistance: {
      roll: roll.total ?? 100,
      casterValue: casterActor ? resolveCharacteristicValue(casterActor, "power") : 0,
      targetValues: targetValues,
    },
    statLabel: resolveCharacteristicLabel(resistedWith),
  };
}

function areaResistanceText(area: AreaResistance, statLabel: string): string {
  const threshold = areaResistanceThreshold(area.casterValue, area.roll);
  const key =
    threshold === "all"
      ? "RQG.ChatMessage.SpellCast.AreaResistance.AffectsAll"
      : threshold === "none"
        ? "RQG.ChatMessage.SpellCast.AreaResistance.AffectsNone"
        : "RQG.ChatMessage.SpellCast.AreaResistance.AffectsUpTo";
  return localize(key, {
    roll: String(area.roll),
    value: typeof threshold === "number" ? String(threshold) : "",
    stat: statLabel,
  });
}
