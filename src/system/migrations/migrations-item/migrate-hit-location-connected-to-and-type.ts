import { ItemTypeEnum } from "@item-model/item-types.ts";
import type { HitLocationItem } from "@item-model/hit-location-data-model.ts";
import { HitLocationTypesEnum } from "@item-model/hit-location-enums.ts";
import {
  ActorTypeEnum,
  type CharacterActor,
} from "../../../data-model/actor-data/rqg-actor-data.ts";
import { isDocumentSubType } from "../../util.ts";
import { systemId } from "../../config";
import type { RqgItem } from "@items/rqg-item.ts";
import type { RqgActor } from "@actors/rqg-actor.ts";
import type { MigrationDocumentLink } from "../apply-migrations";
import type { MigrationLogger } from "../../logging/migration-logger.ts";

type CanonicalHumanoidFields = {
  hitLocationType: (typeof HitLocationTypesEnum)[keyof typeof HitLocationTypesEnum];
  connectedTo?: string;
};

// For a confirmed-humanoid actor (RqgActor.getBodyType() === "humanoid" - exactly the canonical
// 7 hit locations, no more, no less), a hit location's own rqid alone tells us both fields with
// certainty: e.g. "i.hit-location.right-leg" is always a Limb connected to the abdomen. That
// makes the fragile "guess from a sibling's name" approach unnecessary for this case - it's only
// needed as a fallback for non-humanoid actors, where there's no fixed canonical answer.
const canonicalHumanoidFields: ReadonlyMap<string, CanonicalHumanoidFields> = new Map([
  ["i.hit-location.head", { hitLocationType: HitLocationTypesEnum.Head }],
  ["i.hit-location.chest", { hitLocationType: HitLocationTypesEnum.Chest }],
  ["i.hit-location.abdomen", { hitLocationType: HitLocationTypesEnum.Abdomen }],
  [
    "i.hit-location.left-arm",
    { hitLocationType: HitLocationTypesEnum.Limb, connectedTo: "i.hit-location.chest" },
  ],
  [
    "i.hit-location.right-arm",
    { hitLocationType: HitLocationTypesEnum.Limb, connectedTo: "i.hit-location.chest" },
  ],
  [
    "i.hit-location.left-leg",
    { hitLocationType: HitLocationTypesEnum.Limb, connectedTo: "i.hit-location.abdomen" },
  ],
  [
    "i.hit-location.right-leg",
    { hitLocationType: HitLocationTypesEnum.Limb, connectedTo: "i.hit-location.abdomen" },
  ],
]);

/**
 * Repairs two hit-location fields that silently break the "useless legs" matching used by
 * damage/healing calculations when wrong, with no error surfaced anywhere:
 *  - `hitLocationType` ("act as"): drives limb vs head/chest/abdomen damage rules.
 *  - `connectedTo`: which torso location a limb is attached to, compared by rqid.
 *
 * On a confirmed-humanoid actor, both are derived directly from the item's own rqid and always
 * synced to that canonical value - even overwriting an already-valid-but-wrong value (e.g. a
 * right-leg somehow typed as "chest", or connected to the chest instead of the abdomen). There's
 * no legitimate reason a humanoid's fixed 7-location anatomy would intentionally deviate, so
 * certainty here beats caution.
 *
 * On any other actor, `hitLocationType` is left alone entirely (no reliable reference for
 * non-standard anatomy), and `connectedTo` falls back to resolving a legacy name-based value
 * against a same-named sibling on the same actor - actor-local, so it works regardless of
 * species or locale, but only repairs what the old data already pointed at, and never overwrites
 * an already-valid rqid.
 */
export async function migrateHitLocationConnectedToAndType(
  itemData: RqgItem,
  owningActorData?: RqgActor,
  migrationLogger?: MigrationLogger,
): Promise<Item.UpdateData> {
  if (!isDocumentSubType<HitLocationItem>(itemData, ItemTypeEnum.HitLocation)) {
    return {};
  }

  const isHumanoidActor =
    isDocumentSubType<CharacterActor>(owningActorData, ActorTypeEnum.Character) &&
    owningActorData.getBodyType() === "humanoid";

  const ownRqid = itemData.flags?.[systemId]?.documentRqidFlags?.id ?? "";
  const canonicalFields = isHumanoidActor ? canonicalHumanoidFields.get(ownRqid) : undefined;

  const systemUpdate: { hitLocationType?: string; connectedTo?: string } = {};

  if (canonicalFields && itemData.system.hitLocationType !== canonicalFields.hitLocationType) {
    systemUpdate["hitLocationType"] = canonicalFields.hitLocationType;
  }

  const connectedToFix = getConnectedToFix(
    itemData,
    canonicalFields,
    owningActorData,
    migrationLogger,
  );
  if (connectedToFix) {
    systemUpdate["connectedTo"] = connectedToFix;
  }

  if (Object.keys(systemUpdate).length === 0) {
    return {};
  }

  return { system: systemUpdate } as Item.UpdateData;
}

function getConnectedToFix(
  itemData: HitLocationItem,
  canonicalFields: CanonicalHumanoidFields | undefined,
  owningActorData: RqgActor | undefined,
  migrationLogger: MigrationLogger | undefined,
): string | undefined {
  const connectedTo = itemData.system.connectedTo;

  // Confirmed-humanoid canonical limb: always sync to the known-correct connection, regardless
  // of the current value (blank, a legacy name, or a valid-but-wrong rqid).
  if (canonicalFields?.connectedTo) {
    return connectedTo === canonicalFields.connectedTo ? undefined : canonicalFields.connectedTo;
  }

  // Without an owning actor - a standalone template item in a world/compendium Item pack (e.g.
  // library packs of hit locations used to build out actors elsewhere) - there are no sibling
  // hit locations to validate or repair connectedTo against. The value there is just an rqid
  // string awaiting a real actor context; we have no way to tell a genuinely broken one from an
  // already-correct one, so leave it alone rather than warn about something that may well be
  // fine.
  if (!owningActorData || !connectedTo) {
    return undefined;
  }

  const siblingHitLocations = owningActorData.items.filter((i) =>
    isDocumentSubType<HitLocationItem>(i, ItemTypeEnum.HitLocation),
  ) as HitLocationItem[];

  const alreadyMatchesARqid = siblingHitLocations.some(
    (sibling) => sibling.flags?.[systemId]?.documentRqidFlags?.id === connectedTo,
  );
  if (alreadyMatchesARqid) {
    return undefined;
  }

  const matchedSibling = siblingHitLocations.find((sibling) => sibling.name === connectedTo);
  const matchedRqid = matchedSibling?.flags?.[systemId]?.documentRqidFlags?.id;
  if (matchedRqid) {
    return matchedRqid;
  }

  const documents: MigrationDocumentLink[] = [
    {
      kind: "Actor",
      uuid: owningActorData.uuid,
      label: owningActorData.name ?? "Actor",
    },
    {
      kind: "Item",
      uuid: itemData.uuid ?? "",
      label: itemData.name ?? "Hit Location",
    },
  ];
  migrationLogger?.warn(
    `Hit location [${itemData.name}] has a "Connected to" value ("${connectedTo}") that doesn't match a known rqid or a sibling hit location by name; leaving it as-is.`,
    { notify: false, documents },
  );
  return undefined;
}
