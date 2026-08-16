import type { RqgActor } from "@actors/rqg-actor.ts";
import type { CultItem } from "@item-model/cult-data-model.ts";
import type { RqidString } from "./api/rqid-api";
import { localize } from "./util";
import { systemId } from "./config";
import { documentRqidFlags } from "../data-model/shared/rqg-document-flags";
import { getAlliedBondActor } from "./magic-point-source";

/**
 * Where to draw Rune Points from when casting a Rune Magic spell (#957).
 * "self" - the caster's own cult pool (default, matches pre-#957 behavior; unlike Magic Points,
 *          Rune Points never had an "auto"/storage-item concept - they only ever came from the
 *          cult tied to the spell).
 * "ally" - the caster's linked Allied Spirit bond partner's Rune Points for that *same* cult (see
 *          getAlliedCultItem). Only offered as an option when such a matching cult exists.
 *
 * Bond resolution and ownership gating (which side of the bond is usable, by whom) is not
 * reimplemented here - getAlliedCultItem goes through getAlliedBondActor from
 * magic-point-source.ts, the single source of truth also used for Magic Point sharing. A future
 * change to that gating (e.g. tightening the isOwner check) applies to both Rune and Magic Point
 * sharing automatically.
 */
export type RunePointSourceSelection = string;

export const SELF_RUNE_POINT_SOURCE = "self";
export const ALLY_RUNE_POINT_SOURCE = "ally";

/**
 * The rqid identifying which cult a Cult item represents (e.g. "je.orlanth") - the same compendium
 * cult copied onto two different actors' sheets shares this id, unlike `deity` which is just
 * display text and can vary (e.g. subcults).
 */
function getCultRqid(cult: CultItem): RqidString | undefined {
  return cult.getFlag(systemId, documentRqidFlags)?.id;
}

/**
 * The linked Allied Spirit bond partner's (#957, either direction - see getAlliedBondActor)
 * embedded Cult item for the *same* cult as `cult`, matched by rqid. Core p.277: "An allied
 * spirit is an initiate of the cult and can sacrifice for Rune points, just as a normal
 * initiate" - the ally only shares Rune Points for the cult it's actually initiated to, not any
 * cult either side happens to belong to.
 */
export function getAlliedCultItem(
  actor: RqgActor,
  cult: CultItem,
): { actor: RqgActor; cult: CultItem } | undefined {
  const ally = getAlliedBondActor(actor);
  const cultRqid = getCultRqid(cult);
  if (!ally || !cultRqid) {
    return undefined;
  }
  const allyCult = ally.getBestEmbeddedDocumentByRqid(cultRqid) as CultItem | undefined;
  return allyCult ? { actor: ally, cult: allyCult } : undefined;
}

/**
 * Options for a Rune Point source picker, excluding "self" - only populated (non-empty) when the
 * caster has a usable Allied Spirit bond partner (#957) who's also initiated to this same cult,
 * since the dialog should only show a picker at all when there's a second possible source.
 */
export function getRunePointSourceOptions(
  actor: RqgActor | null | undefined,
  cult: CultItem | null | undefined,
): SelectOptionData<string>[] {
  const allied = actor && cult ? getAlliedCultItem(actor, cult) : undefined;
  if (!allied) {
    return [];
  }
  return [
    { value: SELF_RUNE_POINT_SOURCE, label: "RQG.Dialog.Common.RunePointSourceOptions.Self" },
    // Just the bond partner's name, not a templated "Allied Spirit (Name)" label - same reasoning
    // as the "ally" case in getMagicPointSourceOptions (magic-point-source.ts).
    { value: ALLY_RUNE_POINT_SOURCE, label: allied.actor.name ?? "" },
  ];
}

export function getAvailableRunePoints(
  actor: RqgActor | null | undefined,
  cult: CultItem | null | undefined,
  source: RunePointSourceSelection = SELF_RUNE_POINT_SOURCE,
): number {
  if (source === ALLY_RUNE_POINT_SOURCE && actor && cult) {
    const allied = getAlliedCultItem(actor, cult);
    return Number(allied?.cult.system.runePoints.value) || 0;
  }
  return Number(cult?.system.runePoints.value) || 0;
}

/**
 * Deduct `amount` Rune Points from `cult`, or - when `source` is "ally" and a matching cult
 * exists on the linked Allied Spirit bond partner (#957) - from the ally's Cult item instead (see
 * getAlliedCultItem). `isOneUse` also reduces the target cult's max, matching a one-use Rune
 * spell's cost (Core rules). Validation (is there enough available) is expected to have already
 * happened via getAvailableRunePoints() - by this point a shortfall is simply drawn as far as it
 * goes, mirroring spendMagicPoints in magic-point-source.ts.
 */
export async function spendRunePoints(
  actor: RqgActor,
  cult: CultItem,
  amount: number,
  source: RunePointSourceSelection = SELF_RUNE_POINT_SOURCE,
  isOneUse: boolean = false,
): Promise<void> {
  const allied = source === ALLY_RUNE_POINT_SOURCE ? getAlliedCultItem(actor, cult) : undefined;
  const targetActor = allied?.actor ?? actor;
  const targetCult = allied?.cult ?? cult;

  const newValue = (targetCult.system.runePoints.value || 0) - amount;
  let newMax = targetCult.system.runePoints.max || 0;
  if (isOneUse) {
    newMax -= amount;
    if (newMax < (targetCult.system.runePoints.max || 0)) {
      ui.notifications?.info(
        localize("RQG.Item.RuneMagic.SpentOneUseRunePoints", {
          actorName: targetActor.name,
          runePoints: amount.toString(),
          cultName: targetCult.name,
        }),
      );
    }
  }
  const updateCultItemRunePoints: Item.UpdateData = {
    _id: targetCult.id,
    system: { runePoints: { value: newValue, max: newMax } },
  } as any; // runePoints is a cult-specific field not in the base Item update type
  await targetActor.updateEmbeddedDocuments("Item", [updateCultItemRunePoints]);
}
