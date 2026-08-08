import { activateChatTab, isTruthy, localize } from "../../system/util";
import { templatePaths } from "../../system/load-handlebars-templates";
import { AbilitySuccessLevelEnum } from "../ability-roll/ability-roll.defs";
import type {
  ImprovementGateSpec,
  ImprovementResolution,
  ImprovementResult,
} from "./improvement-roll.types";

/**
 * Renders one chat card per improvement action from the normalized resolver result. Knows nothing
 * about abilities or characteristics - everything domain specific arrives as detail rows and
 * comparator policy on the request.
 *
 * The card is two independently-expandable roll blocks: a gate roll (skipped for ungated sources
 * like ability training) and, only when the gate succeeded (or there was none), a gain roll
 * followed by a plain "before → after" line.
 */
export async function showImprovementChatMessage(resolution: ImprovementResolution): Promise<void> {
  const { result, gateRoll, gainRoll } = resolution;
  const { request } = result;
  const showGateRoll = request.gate != null;
  const showGainRoll = result.succeeded;
  const speakerUuid = ChatMessage.getSpeakerActor(request.speaker)?.uuid; // Used for hiding parts
  const gateDisplay = request.gate ? getGateDisplay(request.gate) : undefined;

  // Independent template renders - run in parallel rather than blocking one on the other.
  const [gateTooltip, gainTooltip] = await Promise.all([
    showGateRoll ? renderGateTooltip(result, speakerUuid) : undefined,
    showGainRoll ? renderGainTooltip(result, gainRoll, speakerUuid) : undefined,
  ]);

  const content = await foundry.applications.handlebars.renderTemplate(
    templatePaths.improvementRoll,
    {
      showGateRoll,
      // Reuses the roll card success/failure colouring and wording of the other RQG roll cards.
      gateSuccessLevel: result.succeeded
        ? AbilitySuccessLevelEnum.Success
        : AbilitySuccessLevelEnum.Failure,
      gateOutcomeText: localize(
        `RQG.Game.AbilityResultEnum.${result.succeeded ? AbilitySuccessLevelEnum.Success : AbilitySuccessLevelEnum.Failure}`,
      ),
      gateFormula: gateRoll?.formula,
      gateTotal: result.gateTotal,
      comparatorSymbol: gateDisplay?.symbol,
      threshold: gateDisplay?.threshold,
      gateTooltip,

      showGainRoll,
      gainLabel: localize("RQG.Roll.ImprovementRoll.Gain"),
      gainDisplay: showGainRoll ? String(result.gain) : undefined,
      gainTooltip,
      valueChange: showGainRoll
        ? localize("RQG.Roll.ImprovementRoll.ValueChange", {
            from: `${result.previousValue}${request.valueSuffix}`,
            to: `${result.newValue}${request.valueSuffix}`,
          })
        : undefined,

      speakerUuid,
    },
  );

  activateChatTab();
  const message = await ChatMessage.create(
    {
      speaker: request.speaker,
      flavor: buildFlavor(request),
      content: content,
      rolls: [gateRoll, gainRoll].filter(isTruthy),
    },
    { rollMode: "roll" },
  );

  if (message?.id != null) {
    await game.dice3d?.waitFor3DAnimationByMessageID(message.id);
  }
}

/** Html for what is being improved, shown in the chat message header. */
function buildFlavor(request: ImprovementResult["request"]): string {
  const flavorImg = request.img ? `<img src="${request.img}">` : "";
  return `
<div class="rqg flavor">${flavorImg}</div>
<span class="roll-action">${request.name}</span>
<span>${request.typeLocName}</span><br>
<div class="improvement-attempt"><i class="fa-fw fa-solid fa-arrow-trend-up"></i> ${localize(`RQG.Roll.ImprovementRoll.Attempt.${request.source}`)}</div>`;
}

/**
 * How to display a gate's target. Roll-under is the default target direction every other roll
 * card in the app already uses (skill/characteristic checks show a bare target, no symbol), so it
 * gets no symbol here either. Roll-over gates normally show ">threshold", except when the
 * threshold has been pushed to 100 or beyond (a heavily negative category modifier) *and* the
 * domain grants a natural-100 exception - there, showing the raw (possibly >100) threshold would
 * look like an impossible target on a d100, so "=100" is shown instead: a d100 can never roll
 * higher, so ">100"/"≥100" collapse to "exactly 100", and a bare "100" would be ambiguous with
 * the symbol-less roll-under convention above.
 */
export function getGateDisplay(gate: ImprovementGateSpec): { symbol: string; threshold: number } {
  if (gate.comparator === "roll-under") {
    return { symbol: "", threshold: gate.threshold };
  }
  if (gate.naturalHundredAlwaysSucceeds && gate.threshold >= 100) {
    return { symbol: "=", threshold: 100 };
  }
  return { symbol: ">", threshold: gate.threshold };
}

/** Tooltip for the gate roll: the adapter's threshold-derivation chips (e.g. skill value − category modifier). */
async function renderGateTooltip(
  result: ImprovementResult,
  speakerUuid: string | undefined,
): Promise<string> {
  return foundry.applications.handlebars.renderTemplate(templatePaths.improvementRollTooltip, {
    chips: result.request.gateBreakdownChips,
    speakerUuid,
  });
}

/**
 * Tooltip for the gain roll: a single chip with the formula that produced it, matching how
 * ability-roll-tooltip.hbs shows its base chance as one unmodified chip.
 */
async function renderGainTooltip(
  result: ImprovementResult,
  gainRoll: foundry.dice.Roll | undefined,
  speakerUuid: string | undefined,
): Promise<string> {
  const formula = gainRoll?.formula ?? result.request.gain.formula;
  return foundry.applications.handlebars.renderTemplate(templatePaths.improvementRollTooltip, {
    chips: [{ value: formula, label: localize("RQG.Roll.ImprovementRoll.Formula") }],
    speakerUuid,
  });
}
