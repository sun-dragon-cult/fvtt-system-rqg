import type { RqgItem } from "@items/rqg-item.ts";
import type { RuneItem } from "@item-model/rune-data-model.ts";
import { ItemTypeEnum } from "@item-model/item-types.ts";
import { isDocumentSubType } from "../../util";
import type { RqgActor } from "@actors/rqg-actor.ts";

const canonicalPowerOpposingRqids: Readonly<Record<string, string>> = {
  "i.rune.fertility-power": "i.rune.death-power",
  "i.rune.death-power": "i.rune.fertility-power",
  "i.rune.harmony-power": "i.rune.disorder-power",
  "i.rune.disorder-power": "i.rune.harmony-power",
  "i.rune.truth-power": "i.rune.illusion-power",
  "i.rune.illusion-power": "i.rune.truth-power",
  "i.rune.stasis-power": "i.rune.movement-power",
  "i.rune.movement-power": "i.rune.stasis-power",
};

function getDocumentRqid(item: RqgItem): string | undefined {
  return item.flags?.rqg?.documentRqidFlags?.id;
}

function actorHasRuneWithRqid(owningActorData: RqgActor | undefined, rqid: string): boolean {
  if (!owningActorData) {
    return false;
  }

  return (owningActorData.items.contents as RqgItem[]).some((candidate) => {
    if (!isDocumentSubType<RuneItem>(candidate, ItemTypeEnum.Rune)) {
      return false;
    }
    return getDocumentRqid(candidate) === rqid;
  });
}

function findManBeastOpposingRuneRqid(
  currentRuneRqid: string,
  owningActorData?: RqgActor,
): string | undefined {
  if (
    currentRuneRqid === "i.rune.man-form" &&
    actorHasRuneWithRqid(owningActorData, "i.rune.beast-form")
  ) {
    return "i.rune.beast-form";
  }

  if (
    currentRuneRqid === "i.rune.beast-form" &&
    actorHasRuneWithRqid(owningActorData, "i.rune.man-form")
  ) {
    return "i.rune.man-form";
  }

  return undefined;
}

function findReciprocalOpposingRuneRqid(
  currentRuneRqid: string,
  owningActorData?: RqgActor,
): string | undefined {
  if (!owningActorData) {
    return undefined;
  }

  const reciprocal = (owningActorData.items.contents as RqgItem[]).find((candidate) => {
    if (!isDocumentSubType<RuneItem>(candidate, ItemTypeEnum.Rune)) {
      return false;
    }
    return candidate.system.opposingRuneRqidLink?.rqid === currentRuneRqid;
  });

  return reciprocal ? getDocumentRqid(reciprocal) : undefined;
}

/** Derives a display name from an RQID, e.g. "i.rune.fertility-power" → "Fertility Power". */
function nameFromRqid(rqid: string): string {
  const baseName = rqid.match(/\.([^.]+)$/)?.[1];
  if (!baseName) {
    return rqid;
  }
  return baseName
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function resolveOpposingRuneName(opposingRqid: string, owningActorData?: RqgActor): string {
  if (owningActorData) {
    const match = (owningActorData.items.contents as RqgItem[]).find(
      (candidate) =>
        isDocumentSubType<RuneItem>(candidate, ItemTypeEnum.Rune) &&
        getDocumentRqid(candidate) === opposingRqid,
    );
    if (match?.name) {
      return match.name;
    }
  }
  return nameFromRqid(opposingRqid);
}

/**
 * Backfills missing/incorrect rune opposing links.
 *
 * Strategy:
 * 1) Use deterministic canonical power-rune oppositions.
 * 2) Otherwise, for embedded actor items, use reciprocal opposing links on sibling runes.
 */
export async function migrateRuneOpposingRqidLinks(
  itemData: RqgItem,
  owningActorData?: RqgActor,
): Promise<Item.UpdateData> {
  if (!isDocumentSubType<RuneItem>(itemData, ItemTypeEnum.Rune)) {
    return {};
  }

  const runeRqid = getDocumentRqid(itemData);
  if (!runeRqid) {
    return {};
  }

  const desiredOpposingRqid =
    canonicalPowerOpposingRqids[runeRqid] ??
    findManBeastOpposingRuneRqid(runeRqid, owningActorData) ??
    findReciprocalOpposingRuneRqid(runeRqid, owningActorData);

  if (!desiredOpposingRqid) {
    return {};
  }

  const currentOpposingRqid = itemData.system.opposingRuneRqidLink?.rqid;
  const currentOpposingName = itemData.system.opposingRuneRqidLink?.name ?? "";
  const desiredOpposingName = resolveOpposingRuneName(desiredOpposingRqid, owningActorData);

  if (currentOpposingRqid === desiredOpposingRqid && currentOpposingName === desiredOpposingName) {
    return {};
  }

  return {
    system: {
      opposingRuneRqidLink: {
        rqid: desiredOpposingRqid,
        name: desiredOpposingName,
      },
    },
  } as Item.UpdateData;
}
