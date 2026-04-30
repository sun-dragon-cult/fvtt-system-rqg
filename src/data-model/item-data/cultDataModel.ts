import type { RqgItem } from "@items/rqgItem.ts";
import { RqgItemDataModel } from "./RqgItemDataModel";
import { rqidLinkSchemaField, rqidLinkArraySchemaField } from "../shared/rqidLinkField";
import type { RqidLink } from "../shared/rqidLink";
import type { RqidString } from "../../system/api/rqidApi";
import { resourceSchemaField } from "../shared/resourceSchemaField";
import { enumChoices } from "../shared/enumChoices";
import type { RqgActor } from "../../actors/rqgActor";
import { assertDocumentSubType, isDocumentSubType, isTruthy, RqgError } from "../../system/util";
import { ActorTypeEnum, type CharacterActor } from "../actor-data/rqgActorData";
import type { RuneMagicItem } from "./runeMagicDataModel";
import { Rqid } from "../../system/api/rqidApi";
import { deriveCultItemName } from "@items/cult-item/cultHelpers";

export type CultItem = RqgItem & { system: Item.SystemOfType<"cult"> };

export const CultRankEnum = {
  LayMember: "layMember",
  Initiate: "initiate",
  GodTalker: "godTalker",
  RunePriest: "runePriest",
  RuneLord: "runeLord",
  ChiefPriest: "chiefPriest",
  HighPriest: "highPriest",
} as const;
export type CultRankEnum = (typeof CultRankEnum)[keyof typeof CultRankEnum];

export interface JoinedCult {
  cultName: string | undefined; // For cults with subcults (like Orlanth & Yelm) others should have the Deity name
  tagline: string;
  rank: CultRankEnum; // TODO You can be a Rune Lord and Priest!
  // cultSkills: string[]; // TODO #204 +++ Link to system wide id...
  // favouredPassions: string[]; // TODO Link to system wide id...
  // cultEnchantments: string[]; // TODO Link to system wide id...
  // cultStartingSkills: cultStartingSkill[] // TODO #204 +++ list of skills with base chance mod, see occupation
  // cultSpiritMagic: string[]; // TODO Link to system wide id...
}

const { ArrayField, SchemaField, StringField } = foundry.data.fields;

type CultSchema = ReturnType<typeof CultDataModel.defineSchema>;

export class CultDataModel extends RqgItemDataModel<CultSchema> {
  declare runeRqidLinks: RqidLink<`i.rune.${string}`>[];
  declare commonRuneMagicRqidLinks: RqidLink<`i.rune-magic.${string}`>[];
  declare descriptionRqidLink: RqidLink<RqidString>;

  static override defineSchema() {
    return {
      deity: new StringField({ blank: true, nullable: true, initial: undefined }),
      descriptionRqidLink: rqidLinkSchemaField({ nullable: true }),
      runePoints: resourceSchemaField(),
      holyDays: new StringField({ blank: true, nullable: false, initial: "" }),
      gifts: new StringField({ blank: true, nullable: false, initial: "" }),
      geases: new StringField({ blank: true, nullable: false, initial: "" }),
      runeRqidLinks: rqidLinkArraySchemaField(),
      commonRuneMagicRqidLinks: rqidLinkArraySchemaField(),
      joinedCults: new ArrayField(
        new SchemaField({
          cultName: new StringField({ blank: true, nullable: true, initial: undefined }),
          tagline: new StringField({ blank: true, nullable: false, initial: "" }),
          rank: new StringField({
            blank: false,
            nullable: false,
            initial: CultRankEnum.LayMember,
            choices: enumChoices(CultRankEnum, "RQG.Actor.RuneMagic.CultRank."),
          }),
        }),
      ),
    } as const;
  }

  override onDeleteItem(actor: RqgActor): any[] {
    const cultItem = this.parent as CultItem;
    const cultRuneMagicItems = actor.items.filter(
      (i) => isDocumentSubType<RuneMagicItem>(i, "runeMagic") && i.system.cultId === cultItem.id,
    ) as RuneMagicItem[];
    return cultRuneMagicItems.map((i) => {
      return { _id: i.id, "system.cultId": "" };
    });
  }

  override async onEmbedItem(actor: RqgActor): Promise<any> {
    const child = this.parent as CultItem;
    assertDocumentSubType<CharacterActor>(actor, ActorTypeEnum.Character);
    const matchingDeityInActorCults = actor.items.filter(
      (i) => isDocumentSubType<CultItem>(i, "cult") && i.system.deity === child.system.deity,
    ) as CultItem[];

    switch (matchingDeityInActorCults.length) {
      case 1: {
        // This is a new deity to the actor
        await CultDataModel.embedCommonRuneMagic(child);
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
  }

  static async embedCommonRuneMagic(cult: RqgItem): Promise<void> {
    const actor = cult.parent;
    assertDocumentSubType<CharacterActor>(
      actor,
      ActorTypeEnum.Character,
      "Bug - tried to embed linked common rune magic on a cult that is not embedded",
    );
    assertDocumentSubType<CultItem>(
      cult,
      "cult",
      "Bug - tried to embed linked common rune magic with a cult that does not have id",
    );

    const runeMagicItems = await Promise.all(
      cult.system.commonRuneMagicRqidLinks.map(
        async (rqidLink) => await Rqid.fromRqid(rqidLink.rqid),
      ),
    );

    const connectedRuneMagicItems = runeMagicItems.filter(isTruthy).map((rm) => {
      rm.system.cultId = cult.id!;
      return rm.toObject(false);
    });

    await actor.createEmbeddedDocuments("Item", connectedRuneMagicItems as any);
  }
}
