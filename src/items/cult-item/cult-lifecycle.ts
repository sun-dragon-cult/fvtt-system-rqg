import { ItemTypeEnum } from "@item-model/item-types.ts";
import { assertDocumentSubType, isDocumentSubType, isTruthy, RqgError } from "../../system/util";
import { deriveCultItemName } from "./cult-helpers";
import { Rqid } from "../../system/api/rqid-api";
import type { RqidLink } from "../../data-model/shared/rqid-link";
import type { RqgActor } from "@actors/rqg-actor.ts";
import type { RqgItem } from "@items/rqg-item.ts";
import type { CultItem } from "@item-model/cult-data-model.ts";
import { ActorTypeEnum, type CharacterActor } from "../../data-model/actor-data/rqg-actor-data.ts";
import type { RuneMagicItem } from "@item-model/rune-magic-data-model.ts";

function toCanonicalItemRqid(rqid: string, itemType: "rune" | "rune-magic"): string {
  const match = rqid.match(new RegExp(`(?:^|\\.)(i\\.${itemType}\\.[^.]+)$`));
  return match?.[1] ?? rqid;
}

function normalizeRqidLinks(
  links: RqidLink[] | undefined,
  itemType: "rune" | "rune-magic",
): RqidLink[] {
  return (links ?? []).map((link) => {
    const rqid = toCanonicalItemRqid(link.rqid, itemType);
    const normalized: RqidLink = {
      rqid,
      name: link.name,
      bonus: undefined,
    };
    if (Number.isFinite(link.bonus)) {
      normalized.bonus = Number(link.bonus);
    }
    return normalized;
  });
}

async function embedCommonRuneMagic(
  cult: RqgItem,
  commonRuneMagicRqidLinks?: RqidLink[],
): Promise<void> {
  const actor = cult.parent;
  assertDocumentSubType<CharacterActor>(
    actor,
    ActorTypeEnum.Character,
    "Bug - tried to embed linked common rune magic on a cult that is not embedded",
  );
  assertDocumentSubType<CultItem>(
    cult,
    ItemTypeEnum.Cult,
    "Bug - tried to embed linked common rune magic with a cult that does not have id",
  );

  const runeMagicItems = await Promise.all(
    (commonRuneMagicRqidLinks ?? cult.system.commonRuneMagicRqidLinks).map(
      async (rqidLink) => await Rqid.fromRqid(rqidLink.rqid),
    ),
  );

  const connectedRuneMagicItems = runeMagicItems.filter(isTruthy).map((rm) => {
    const embeddedRuneMagic = rm.toObject(false) as any;
    embeddedRuneMagic.system ??= {};
    embeddedRuneMagic.system.cultId = cult.id!;
    return embeddedRuneMagic;
  });

  await actor.createEmbeddedDocuments("Item", connectedRuneMagicItems as any);
}

export const cultLifecycle = {
  /*
   * Unlink the runeMagic spells that was connected with this cult
   */
  handleActorOnDeleteDescendantDocuments(
    actor: RqgActor,
    cultItem: RqgItem,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    options: any,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    userId: string,
  ): any[] {
    const cultRuneMagicItems = actor.items.filter(
      (i) =>
        isDocumentSubType<RuneMagicItem>(i, ItemTypeEnum.RuneMagic) &&
        i.system.cultId === cultItem.id,
    ) as RuneMagicItem[];
    return cultRuneMagicItems.map((i) => {
      return { _id: i.id, "system.cultId": "" };
    });
  },

  /**
   * If the actor already has a Cult with the same Deity, then merge the data from the joined subcults.
   */
  async handleActorOnCreateDescendantDocuments(
    actor: RqgActor,
    child: RqgItem,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    options: any,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    userId: string,
  ): Promise<any> {
    assertDocumentSubType<CultItem>(child, ItemTypeEnum.Cult);
    assertDocumentSubType<CharacterActor>(actor, ActorTypeEnum.Character);
    const matchingDeityInActorCults = actor.items.filter(
      (i) =>
        isDocumentSubType<CultItem>(i, ItemTypeEnum.Cult) && i.system.deity === child.system.deity,
    ) as CultItem[];

    switch (matchingDeityInActorCults.length) {
      case 1: {
        // This is a new deity to the actor
        const normalizedRuneRqidLinks = normalizeRqidLinks(child.system.runeRqidLinks, "rune");
        const normalizedCommonRuneMagicRqidLinks = normalizeRqidLinks(
          child.system.commonRuneMagicRqidLinks,
          "rune-magic",
        );

        await embedCommonRuneMagic(child, normalizedCommonRuneMagicRqidLinks);

        const hasRuneRqidChanges = normalizedRuneRqidLinks.some(
          (link, index) => link.rqid !== child.system.runeRqidLinks[index]?.rqid,
        );
        const hasCommonRuneMagicRqidChanges = normalizedCommonRuneMagicRqidLinks.some(
          (link, index) => link.rqid !== child.system.commonRuneMagicRqidLinks[index]?.rqid,
        );

        if (hasRuneRqidChanges || hasCommonRuneMagicRqidChanges) {
          return {
            _id: child.id,
            system: {
              runeRqidLinks: normalizedRuneRqidLinks,
              commonRuneMagicRqidLinks: normalizedCommonRuneMagicRqidLinks,
            },
          };
        }
        return;
      }

      case 2: {
        // Actor already has this deity - add the joinedCults from the new and old Cult items
        await child.delete();
        const newJoinedCults = [
          ...matchingDeityInActorCults[0]!.system.joinedCults,
          ...child.system.joinedCults,
        ];
        const newCultItemName = deriveCultItemName(
          matchingDeityInActorCults[0]!.system.deity ?? "",
          newJoinedCults.map((c) => c.cultName ?? ""),
        );

        return {
          _id: matchingDeityInActorCults[0]!.id,
          name: newCultItemName,
          system: {
            joinedCults: newJoinedCults,
          },
        };
      }

      default: {
        // 0 (failed embed) or multiple cults with same deity
        const msg = "Actor should not have multiple Cults with same Deity";
        ui.notifications?.error(msg);
        throw new RqgError(msg, [actor, child]);
      }
    }
  },
  embedCommonRuneMagic,
};
