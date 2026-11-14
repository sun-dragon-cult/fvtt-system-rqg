/**
 * Which Apply the active GM is doing spell work for, per cast record entry. Kept apart from the
 * request handling so the cast runner can free claims without importing it.
 */

type Claim = { applyId: string; running: number; worked: boolean; released: boolean };

/** Entries the active GM is doing spell work for, by `castMessageId.entryId`. */
const claims = new Map<string, Claim>();

const claimKey = (castMessageId: string, entryId: string) => `${castMessageId}.${entryId}`;

export function isOwnedBy(document: unknown, user: User): boolean {
  return !!(
    document as { testUserPermission?(user: User, level: string): boolean } | null | undefined
  )?.testUserPermission?.(user, "OWNER");
}

/** Whether an Apply other than `applyId` holds the entry's claim. */
export function isClaimedByOtherApply(
  castMessageId: string,
  entryId: string,
  applyId: string,
): boolean {
  const claim = claims.get(claimKey(castMessageId, entryId));
  return !!claim && claim.applyId !== applyId;
}

/**
 * Claim the entry for `applyId`, or join its claim; undefined when another Apply holds it. Call
 * the returned `finish` when the work is done; the claim goes once nothing runs and it isn't needed.
 */
export function takeClaim(
  castMessageId: string,
  entryId: string,
  applyId: string,
): { finish(worked: boolean): void } | undefined {
  const key = claimKey(castMessageId, entryId);
  const existing = claims.get(key);
  if (existing && existing.applyId !== applyId) {
    return undefined;
  }
  const claim = existing ?? { applyId, running: 0, worked: false, released: false };
  claims.set(key, claim);
  claim.running++;
  return {
    finish: (worked) => {
      claim.worked ||= worked;
      claim.running--;
      if (!claim.running && (claim.released || !claim.worked) && claims.get(key) === claim) {
        claims.delete(key);
      }
    },
  };
}

/**
 * Free an entry's claim once its cast record notes it applied or a GM ruled on it; while an Apply
 * still runs for it, once that Apply finishes.
 */
export function releaseApplyClaim(castMessageId: string, entryId: string): void {
  const key = claimKey(castMessageId, entryId);
  const claim = claims.get(key);
  if (!claim?.running) {
    claims.delete(key);
  } else {
    claim.released = true;
  }
}

/** Forget every claim; for tests. */
export function clearApplyClaims(): void {
  claims.clear();
}
