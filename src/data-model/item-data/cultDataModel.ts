import type { RqgItem } from "@items/rqgItem.ts";
import type { RqgActor } from "@actors/rqgActor.ts";
import { RqgItemDataModel } from "./RqgItemDataModel";
import { rqidLinkSchemaField, rqidLinkArraySchemaField } from "../shared/rqidLinkField";
import type { RqidLink } from "../shared/rqidLink";
import type { RqidString } from "../../system/api/rqidApi";
import { resourceSchemaField } from "../shared/resourceSchemaField";
import { enumChoices } from "../shared/enumChoices";
import {
  assertDocumentSubType,
  formatListByWorldLanguage,
  isDocumentSubType,
  isTruthy,
  RqgError,
} from "../../system/util";
import { ActorTypeEnum, type CharacterActor } from "../actor-data/rqgActorData";
import { ItemTypeEnum } from "./itemTypes";
import { Rqid } from "../../system/api/rqidApi";
import type { RuneMagicItem } from "./runeMagicDataModel";

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

  /**
   * Unlink the runeMagic spells that was connected with this cult.
   */
  override onDeleteItem(
    actor: RqgActor,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _options: any,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _userId: string,
  ): Record<string, unknown>[] {
    const cultItem = this.parent as CultItem;
    const cultRuneMagicItems = actor.items.filter(
      (i) =>
        isDocumentSubType<RuneMagicItem>(i, ItemTypeEnum.RuneMagic) &&
        i.system.cultId === cultItem.id,
    ) as RuneMagicItem[];
    return cultRuneMagicItems.map((i) => {
      return { _id: i.id, "system.cultId": "" };
    });
  }

  /**
   * If the actor already has a Cult with the same Deity, then merge the data from the joined subcults.
   */
  override async onEmbedItem(
    actor: RqgActor,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _options: any,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _userId: string,
  ): Promise<Record<string, unknown>> {
    const child = this.parent as CultItem;
    assertDocumentSubType<CharacterActor>(actor, ActorTypeEnum.Character);
    const matchingDeityInActorCults = actor.items.filter(
      (i) =>
        isDocumentSubType<CultItem>(i, ItemTypeEnum.Cult) && i.system.deity === child.system.deity,
    ) as CultItem[];

    switch (matchingDeityInActorCults.length) {
      case 1: {
        // This is a new deity to the actor
        await this.embedCommonRuneMagic(actor);
        return {};
      }

      case 2: {
        // Actor already has this deity - add the joinedCults from the new and old Cult items
        await child.delete();
        const existingCult = matchingDeityInActorCults[0]!;
        const newJoinedCults = [...existingCult.system.joinedCults, ...child.system.joinedCults];
        const newCultItemName = this.deriveCultItemName(
          existingCult.system.deity ?? "",
          newJoinedCults.map((c) => c.cultName ?? ""),
        );

        return {
          _id: existingCult.id,
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

  private async embedCommonRuneMagic(actor: CharacterActor): Promise<void> {
    const cultItem = this.parent as CultItem;
    const runeMagicItems = await Promise.all(
      this.commonRuneMagicRqidLinks.map(async (rqidLink) => await Rqid.fromRqid(rqidLink.rqid)),
    );

    const connectedRuneMagicItems = runeMagicItems.filter(isTruthy).map((rm) => {
      rm.system.cultId = cultItem.id!;
      return rm.toObject(false);
    });

    await actor.createEmbeddedDocuments("Item", connectedRuneMagicItems as any);
  }

  private deriveCultItemName(deity: string, cultNames: string[]): string {
    const joinedCultsFormatted = formatListByWorldLanguage(
      cultNames.filter(isTruthy).map((c) => c.trim()),
    );

    if (!joinedCultsFormatted || joinedCultsFormatted === deity) {
      return deity.trim();
    }
    return joinedCultsFormatted + ` (${deity.trim()})`;
  }
}
