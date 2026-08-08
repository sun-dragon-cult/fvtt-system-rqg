/**
 * Normalized contracts shared by the ability and characteristic improvement flows.
 *
 * The domain adapters translate their own rules into an {@link ImprovementRequest}, the resolver
 * turns that into an {@link ImprovementResolution}, and the presenter renders the resolution as a
 * single chat card. No domain knowledge lives beyond the adapters.
 */

export type ImprovementDomain = "ability" | "characteristic";

export const improvementSources = ["experience", "research", "training"] as const;

export type ImprovementSource = (typeof improvementSources)[number];

/** Extracts the "experience"/"research"/"training" prefix from a `"<source>-gain-..."` gain type id. */
export function getImprovementSourceFromGainType(gainType: string): ImprovementSource {
  return gainType.split("-")[0] as ImprovementSource;
}

/**
 * Which direction a gate roll has to go to succeed. Abilities gain when the roll beats the current
 * value (Core p.415), characteristics gain when the roll lands under the improvement chance
 * (Core p.418).
 */
export type ImprovementComparator = "roll-over" | "roll-under";

/** One line in the expandable calculation details of the chat card. */
export type ImprovementDetailRow = {
  label: string;
  value: string;
};

/**
 * The check that decides whether any gain happens at all. Improvement sources without a check
 * (ability training, non-POW characteristic training) leave this undefined and always gain.
 */
export type ImprovementGateSpec = {
  formula: string;
  comparator: ImprovementComparator;
  threshold: number;
  /** roll-over only: a natural 100 on the roll succeeds regardless of the threshold. */
  naturalHundredAlwaysSucceeds?: boolean;
};

export type ImprovementGainSpec = {
  kind: "fixed" | "random";
  /** Roll formula - a plain number for fixed gains, dice for random ones. */
  formula: string;
};

export type ImprovementRequest = {
  domain: ImprovementDomain;
  source: ImprovementSource;
  /** Name of the improved ability or characteristic. */
  name: string;
  /** Translated item type / "Characteristic". */
  typeLocName: string;
  img?: string | null;
  actorName: string;
  currentValue: number;
  /** "%" for abilities, "" for characteristics. */
  valueSuffix: string;
  gate?: ImprovementGateSpec;
  gain: ImprovementGainSpec;
  /**
   * Chips explaining how the gate's threshold was derived, shown in the gate roll's expandable
   * details - only populated when that derivation isn't already the number shown in the headline.
   */
  gateBreakdownChips: ImprovementDetailRow[];
  speaker: ChatMessage.SpeakerData;
};

export type ImprovementResult = {
  request: ImprovementRequest;
  succeeded: boolean;
  /** Modified total of the gate roll, undefined when the source has no gate. */
  gateTotal?: number;
  /** Unmodified total of the gate roll's first die, undefined when the source has no gate. */
  gateNaturalTotal?: number;
  gain: number;
  previousValue: number;
  newValue: number;
};

export type ImprovementResolution = {
  result: ImprovementResult;
  gateRoll?: foundry.dice.Roll;
  gainRoll?: foundry.dice.Roll;
};
