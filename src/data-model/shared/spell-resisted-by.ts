import type { RqgActor } from "@actors/rqg-actor.ts";
import { localize } from "../../system/util";
import { casterTokenOnScene } from "../../system/spell-effects/spell-area-targets";
import { AbilitySuccessLevelEnum } from "../../rolls/ability-roll/ability-roll.defs";
import {
  isSingleTargetGate,
  isSpiritCombatGate,
  SpellResistedByEnum,
  SpellResistedWithEnum,
} from "../item-data/spell";
import {
  canChooseSpellCastRollMode,
  getDefaultRollMode,
  isHiddenRollMode,
} from "../../applications/app-parts/roll-mode";
import type { SpiritMagicRoll } from "../../rolls/spirit-magic-roll/spirit-magic-roll";
import type { RuneMagicRoll } from "../../rolls/rune-magic-roll/rune-magic-roll";
import type { CreateResistanceRequestParams } from "../../applications/resistance-roll-dialog/create-resistance-request";
import { templatePaths } from "../../system/load-handlebars-templates";
import { areaResistanceThreshold } from "./spell-cast-outcome";
import {
  buildSpellCastEntries,
  type SpellCastRecord,
  type SpellCastTarget,
} from "./spell-cast-record";

/** Outcome of the pre-cast target check, threaded to {@link postSpellCastResult}. */
export type ResistedSpellTarget = {
  proceed: boolean;
  /** Every token targeted when the spell was cast, whatever the resistedBy mode. */
  targets: SpellCastTarget[];
};

/**
 * Pre-cast target check for a resisted spell, run before any points are spent. Unresisted spells
 * pass straight through - targeting is only constrained where a resistance roll or spirit combat
 * depends on it - but their targets are still recorded for the cast outcome. A spell centered on
 * its caster passes the tokens in its area, which take the place of the user's targets, and a spell
 * that reaches only so many targets at its level (Turn Undead) refuses more.
 */
export async function resolveResistedSpellCastTarget(
  resistedBy: SpellResistedByEnum,
  casterActor: RqgActor,
  spellName: string | undefined,
  areaTokens?: readonly foundry.canvas.placeables.Token[],
  maxTargets: number = Infinity,
): Promise<ResistedSpellTarget> {
  const targets = [...(areaTokens ?? game.user?.targets ?? [])];
  const castTargets: SpellCastTarget[] = targets.flatMap((token) =>
    token.document?.uuid && token.document.actor?.uuid
      ? [
          {
            actorUuid: token.document.actor.uuid,
            tokenUuid: token.document.uuid,
            isCaster: token.document.actor.uuid === casterActor.uuid,
          },
        ]
      : [],
  );

  const proceed: ResistedSpellTarget = { proceed: true, targets: castTargets };
  if (targets.length > maxTargets) {
    ui.notifications?.warn(
      maxTargets === 1
        ? localize("RQG.Notification.Warn.ResistedSpellSingleTargetOnly", {
            spellName: spellName ?? "",
          })
        : localize("RQG.Notification.Warn.SpellTooManyTargets", {
            spellName: spellName ?? "",
            count: String(maxTargets),
          }),
    );
    return { proceed: false, targets: castTargets };
  }
  const spiritCombat = isSpiritCombatGate(resistedBy);
  const perTarget = resistedBy === SpellResistedByEnum.ResistanceRollPerTarget;
  if (resistedBy !== SpellResistedByEnum.ResistanceRoll && !spiritCombat && !perTarget) {
    return proceed;
  }

  if (targets.length > 1 && isSingleTargetGate(resistedBy)) {
    ui.notifications?.warn(
      localize("RQG.Notification.Warn.ResistedSpellSingleTargetOnly", {
        spellName: spellName ?? "",
      }),
    );
    return { proceed: false, targets: castTargets };
  }

  if (spiritCombat) {
    return proceed;
  }

  if (targets.length === 0) {
    // With a token on the scene the caster targets themselves; without one, only this offers it.
    const offerSelf = !casterTokenOnScene(undefined, casterActor);
    const choice = await foundry.applications.api.DialogV2.wait({
      window: { title: localize("RQG.Dialog.ResistanceRequest.NoTargetTitle") },
      // In a <p>, or the dialog's flex layout puts the bold spell name on a line of its own
      content: `<p>${localize(
        offerSelf
          ? "RQG.Dialog.ResistanceRequest.NoTargetNoTokenContent"
          : "RQG.Dialog.ResistanceRequest.NoTargetContent",
        { spellName: spellName ?? "" },
      )}</p>`,
      buttons: [
        {
          action: "withoutTarget",
          label: "RQG.Dialog.ResistanceRequest.CastWithoutTarget",
          icon: "fa-solid fa-wand-sparkles",
        },
        ...(offerSelf
          ? [
              {
                action: "self",
                label: "RQG.Dialog.ResistanceRequest.CastOnSelf",
                icon: "fa-solid fa-user",
              },
            ]
          : []),
        { action: "cancel", label: "COMMON.Cancel", icon: "fa-solid fa-xmark", default: true },
      ],
      rejectClose: false,
    });
    if (choice === "self") {
      return {
        proceed: true,
        targets: [{ actorUuid: casterActor.uuid ?? "", tokenUuid: "", isCaster: true }],
      };
    }
    return { proceed: choice === "withoutTarget", targets: castTargets };
  }

  return proceed;
}

/**
 * Posts the cast and starts its record (#1224), which the runner on the active GM's client then
 * advances: each target meets the spell areas it crosses and its protective spells, then resists
 * as `resistedBy` says. The card that holds the record is
 *
 * - for an open single-target resisted cast: one combined card carrying the cast roll, the
 *   target's Resist/Accept and their resistance roll, the way an attack card carries attack and
 *   defence. The spell's name and cast roll are concealed from the target, so they choose without
 *   knowing whether an ally is healing them or an enemy is not;
 * - for every other cast: the `spellCast` message, whispered as its roll mode says. Targets that
 *   resist get their own request card from the runner: an anonymous one for a GM's hidden cast,
 *   one naming the caster otherwise.
 *
 * An area spell's one d100 is the caster's, rolled here; the runner reads each target against it.
 */
export async function postSpellCastResult(params: {
  target: ResistedSpellTarget;
  resistedBy: SpellResistedByEnum;
  resistedWith: SpellResistedWithEnum;
  targetKind: string;
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
  const caster = { actorUuid: casterActor.uuid ?? "", tokenUuid: casterToken?.uuid ?? "" };
  const entries = buildSpellCastEntries({
    castSucceeded: castSucceeded,
    resistedBy: resistedBy,
    targetKind: params.targetKind,
    targets: target.targets,
    caster: caster,
    newId: () => foundry.utils.randomID(),
  });
  // Dynamic import to avoid a circular dependency through rqgItem.ts.
  const { resolveCharacteristicLabel, resolveCharacteristicValue } =
    await import("../../applications/resistance-roll-dialog/resistance-roll-shared");
  const casterPower = resolveCharacteristicValue(casterActor, "power");
  const areaRoll =
    resistedBy === SpellResistedByEnum.ResistanceRollArea &&
    castSucceeded &&
    entries.some((e) => e.actorUuid)
      ? { roll: await rollAreaDie(castRollMode), casterValue: casterPower }
      : null;
  const record: SpellCastRecord = {
    spellUuid: spellUuid,
    casterActorUuid: caster.actorUuid,
    casterTokenUuid: caster.tokenUuid,
    casterPower: casterPower,
    castSuccessLevel: castRoll.successLevel ?? null,
    resistedBy: resistedBy,
    resistedWith: resistedWith,
    castRollMode: castRollMode,
    castOptions: {
      levelUsed: castRoll.options.levelUsed ?? 0,
      magicPointBoost: castRoll.options.magicPointBoost ?? 0,
    },
    areaRoll: areaRoll,
    targets: entries,
  };

  const only = entries.length === 1 ? entries[0] : undefined;
  const combined =
    castSucceeded &&
    !isHiddenRollMode(castRollMode) &&
    resistedBy === SpellResistedByEnum.ResistanceRoll &&
    !!only?.actorUuid &&
    !only.isCaster;
  const { spellUuid: _spellUuid, ...recordFields } = record;
  const message = combined
    ? await requestSpellResistance({
        targetUuid: only.tokenUuid || only.actorUuid,
        casterUuid: caster.tokenUuid || caster.actorUuid,
        resistedWith: resistedWith,
        rollMode: castRollMode,
        frozenValue: casterPower,
        entryId: only.id,
        record: recordFields,
        waiting: true,
        spellCast: {
          castRoll,
          casterTokenOrActorUuid: caster.tokenUuid || caster.actorUuid,
          spellUuid,
        },
      })
    : await castRoll.postToChat({
        type: "spellCast",
        content: await foundry.applications.handlebars.renderTemplate(
          templatePaths.spellCastChatMessage,
          {
            areaResistanceText: areaRoll
              ? areaResistanceText(areaRoll, resolveCharacteristicLabel(resistedWith), resistedWith)
              : "",
          },
        ),
        system: record,
      });
  if (message?.id) {
    // Dynamic import to avoid a circular dependency through rqgItem.ts.
    const { advanceSpellCast } = await import("../../system/spell-effects/spell-cast-runner");
    // Not awaited: the cast is done once its card is posted, the GM's runner reports its own errors
    void advanceSpellCast(message.id);
  }
}

/**
 * Ask a spell's target for a resistance roll against the caster's POW - when the spell is cast,
 * or when Reflection sends it back at its caster. Returns the request card.
 */
export async function requestSpellResistance(params: {
  targetUuid: string;
  casterUuid: string;
  resistedWith: SpellResistedWithEnum;
  rollMode: string;
  /** The caster's POW when they cast it. */
  frozenValue: number;
  spellCast?: CreateResistanceRequestParams["spellCast"];
  spellCastMessageId?: string | undefined;
  entryId?: string | undefined;
  record?: CreateResistanceRequestParams["record"];
  waiting?: boolean | undefined;
  castFlavor?: string | undefined;
  reflectedFrom?: CreateResistanceRequestParams["reflectedFrom"];
}): Promise<ChatMessage | undefined> {
  // Dynamic imports to avoid a circular dependency through rqgItem.ts.
  const [{ createResistanceRequest }, { resolveCharacteristicSide, resolveCharacteristicLabel }] =
    await Promise.all([
      import("../../applications/resistance-roll-dialog/create-resistance-request"),
      import("../../applications/resistance-roll-dialog/resistance-roll-shared"),
    ]);
  const caster = resolveCharacteristicSide(params.casterUuid, "power", "", 0, "");
  const hidden = isHiddenRollMode(params.rollMode as foundry.dice.Roll.Mode);
  return createResistanceRequest({
    targetTokenOrActorUuid: params.targetUuid,
    rollerSide: "passive",
    rollerCharacteristics: params.resistedWith,
    frozenValue: params.frozenValue,
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
    entryId: params.entryId,
    record: params.record,
    waiting: params.waiting,
    castFlavor: params.castFlavor,
    reflectedFrom: params.reflectedFrom,
  });
}

/** The caster's one d100 for a spell resisted by area, shown to the table unless the cast is hidden. */
async function rollAreaDie(rollMode: foundry.dice.Roll.Mode): Promise<number> {
  const roll = await new foundry.dice.Roll("1d100").evaluate();
  if (!isHiddenRollMode(rollMode)) {
    await game.dice3d?.showForRoll(roll, game.user, true, null, false);
  }
  return roll.total ?? 100;
}

function areaResistanceText(
  area: { roll: number; casterValue: number },
  statLabel: string,
  resistedWith: SpellResistedWithEnum,
): string {
  // Anyone has some POW, while magic points can run out
  const lowestValue = resistedWith === SpellResistedWithEnum.MagicPoints ? 0 : 1;
  const threshold = areaResistanceThreshold(area.casterValue, area.roll, lowestValue);
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
