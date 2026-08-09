import { activateChatTab, formatRollFormulaHtml, isTruthy, localize } from "../../system/util";
import { formatDamagePart } from "../../system/combat-calculations";
import { templatePaths } from "../../system/load-handlebars-templates";
import { AbilitySuccessLevelEnum } from "../ability-roll/ability-roll.defs";
import type {
  ImprovementGateSpec,
  ImprovementResolution,
  ImprovementResult,
  ImprovementSource,
} from "./improvement-roll.types";

/**
 * The bare source word shown as an inline tag next to the item name/type in the header - always
 * visible regardless of expand state or success/fail, unlike the gain roll's tooltip (see
 * showImprovementChatMessage's flavor). Deliberately terse: it sits in the header on every card,
 * so it has to survive being next to long item names without pushing the header onto an extra
 * line any more than the icon in front of it already does.
 */
const TITLE_SOURCE_TAG_KEYS: Record<ImprovementSource, string> = {
  experience: "RQG.Roll.ImprovementRoll.Source.experience",
  research: "RQG.Roll.ImprovementRoll.Source.research",
  training: "RQG.Roll.ImprovementRoll.Source.training",
};

/**
 * The compact "(formula)[label]" suffix damage rolls use for each term (see formatDamagePart)
 * reused here so the gain roll's formula line reads "1d6-1 through training" the same way a
 * damage roll reads "1d8+1 weapon damage". Full phrase (not the bare TITLE_SOURCE_TAG_KEYS word)
 * because this only shows up once someone expands the gain roll, where the extra couple of words
 * cost nothing.
 */
const GAIN_TOOLTIP_SOURCE_LABEL_KEYS: Record<ImprovementSource, string> = {
  experience: "RQG.Dialog.improveAbilityDialog.fromExperience",
  research: "RQG.Dialog.improveAbilityDialog.throughResearch",
  training: "RQG.Dialog.improveAbilityDialog.throughTraining",
};

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
    showGateRoll ? renderChipTooltip(result.request.gateBreakdownChips, speakerUuid) : undefined,
    showGainRoll && gainRoll ? renderGainTooltip(gainRoll, request.source, speakerUuid) : undefined,
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
      gainDisplay: showGainRoll ? `${result.gain}${request.valueSuffix}` : undefined,
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

/**
 * Html for what is being improved, shown in the chat message header: the improvement icon sits
 * inline before the name (rather than on its own line) and the source rides along after the type
 * as a short tag, so the header stays glanceable - on both success and failure, since unlike the
 * gain roll's tooltip this line isn't collapsible - without reserving a dedicated row for it.
 */
function buildFlavor(request: ImprovementResult["request"]): string {
  const flavorImg = request.img ? `<img src="${request.img}">` : "";
  const sourceTag = localize(TITLE_SOURCE_TAG_KEYS[request.source]);
  return `
<div class="rqg flavor">${flavorImg}</div>
<i class="fa-fw fa-solid fa-arrow-trend-up improvement-icon"></i>
<span class="roll-action">${request.name}</span>
<span>${request.typeLocName}</span>
<span class="improvement-source-tag">· ${sourceTag}</span>`;
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
  // A category modifier bigger than the base value can push the threshold negative - every roll
  // (minimum 1) already clears that, so clamp the displayed target at 0 rather than showing a
  // threshold that reads as nonsense on a d100 card.
  return { symbol: ">", threshold: Math.max(gate.threshold, 0) };
}

/** Tooltip for the gate roll: the adapter's threshold-derivation chips (e.g. skill value − category modifier). */
async function renderChipTooltip(
  chips: ImprovementResult["request"]["gateBreakdownChips"],
  speakerUuid: string | undefined,
): Promise<string> {
  return foundry.applications.handlebars.renderTemplate(templatePaths.improvementRollTooltip, {
    chips,
    speakerUuid,
  });
}

/**
 * Tooltip for the gain roll: a bracket-flavored formula line plus the individual die faces that
 * were rolled, in the same style DamageRoll uses (see damage-roll-tooltip.hbs) - rather than just
 * restating the formula, so e.g. a Research 1d6-2 roll shows "(1d6-2) through research" above the
 * raw d6 face.
 */
async function renderGainTooltip(
  gainRoll: foundry.dice.Roll,
  source: ImprovementSource,
  speakerUuid: string | undefined,
): Promise<string> {
  return foundry.applications.handlebars.renderTemplate(templatePaths.improvementRollGainTooltip, {
    formulaHtml: formatRollFormulaHtml(
      formatDamagePart(gainRoll.formula, GAIN_TOOLTIP_SOURCE_LABEL_KEYS[source]),
    ),
    parts: gainRoll.dice.map((d) => d.getTooltipData()),
    speakerUuid,
  });
}
