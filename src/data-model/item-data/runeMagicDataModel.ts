import type { RqgItem } from "@items/rqgItem.ts";
import { RqgItemDataModel } from "./RqgItemDataModel";
import { spellSchemaFields } from "../shared/spellSchemaFields";
import type { RqidLink } from "../shared/rqidLink";
import type { RqidString } from "../../system/api/rqidApi";

export type RuneMagicItem = RqgItem & { system: Item.SystemOfType<"runeMagic"> };
import { rqidLinkArraySchemaField } from "../shared/rqidLinkField";
import type { RqgActor } from "../../actors/rqgActor";
import { assertDocumentSubType, isDocumentSubType, localize } from "../../system/util";
import { ActorTypeEnum, type CharacterActor } from "../actor-data/rqgActorData";
import type { RuneItem } from "./runeDataModel";
import type { CultItem } from "./cultDataModel";
import { templatePaths } from "../../system/loadHandlebarsTemplates";

const { BooleanField, StringField } = foundry.data.fields;

type RuneMagicSchema = ReturnType<typeof RuneMagicDataModel.defineSchema>;

export class RuneMagicDataModel extends RqgItemDataModel<RuneMagicSchema, { chance: number }> {
  declare descriptionRqidLink: RqidLink<RqidString>;

  static override defineSchema() {
    return {
      ...spellSchemaFields(),
      cultId: new StringField({ blank: true, nullable: false, initial: "" }),
      runeRqidLinks: rqidLinkArraySchemaField(),
      isStackable: new BooleanField({ nullable: false, initial: false }),
      isOneUse: new BooleanField({ nullable: false, initial: false }),
    } as const;
  }

  override onActorPrepareEmbeddedEntities(): void {
    const actor = (this.parent as RqgItem).actor;
    assertDocumentSubType<CharacterActor>(actor, ActorTypeEnum.Character);

    if (this.cultId) {
      const runeMagicCult = actor.items.get(this.cultId) as RqgItem | undefined;

      if (isDocumentSubType<CultItem>(runeMagicCult, "cult")) {
        this.chance = RuneMagicDataModel.calcRuneMagicChance(
          actor.items.contents,
          runeMagicCult.system.runeRqidLinks,
          this.runeRqidLinks,
        );
      } else {
        this.cultId = ""; // remove the mismatched link to make it appear in the GUI
      }
    }
  }

  private static calcRuneMagicChance(
    actorItems: CharacterActor["items"]["contents"],
    cultRuneRqidLinks: RqidLink[],
    runeMagicRuneRqidLinks: RqidLink[],
  ): number {
    const runeMagicRqids = runeMagicRuneRqidLinks.map((r) => r.rqid);
    const cultRqids = cultRuneRqidLinks.map((r) => r.rqid);
    const runeChances = actorItems.reduce((acc: number[], item) => {
      if (
        isDocumentSubType<RuneItem>(item, "rune") &&
        (runeMagicRqids.includes(item.flags.rqg?.documentRqidFlags?.id ?? "") ||
          (runeMagicRqids.includes(CONFIG.RQG.runeRqid.magic) &&
            cultRqids.includes(item.flags.rqg?.documentRqidFlags?.id ?? "")))
      ) {
        acc.push(item.system.chance);
      }
      return acc;
    }, []);

    return runeChances.length > 0 ? Math.max(...runeChances) : 0;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  override async onEmbedItem(actor: RqgActor, _options: any): Promise<any> {
    let updateData = {};
    const actorCults: CultItem[] = actor.items.filter((i) =>
      isDocumentSubType<CultItem>(i, "cult"),
    );
    assertDocumentSubType<CharacterActor>(actor, ActorTypeEnum.Character);

    const runeMagicItem = this.parent as RuneMagicItem;

    // Do not ask what cult should get the RuneMagic item if it is already attached to a cult from the actor
    if (!this.cultId || !actorCults.some((cult) => cult.id === this.cultId)) {
      let cultId;
      if (actorCults.length === 1 && actorCults[0]!.id) {
        cultId = actorCults[0]!.id;
      } else {
        cultId = await RuneMagicDataModel.chooseCultDialog(
          actorCults.map((c) => {
            return { name: c.name, id: c.id };
          }),
          runeMagicItem.name ?? "",
          actor.name ?? "",
        );
      }
      updateData = {
        _id: runeMagicItem.id,
        system: { cultId: cultId },
      };
    }
    return updateData;
  }

  static async chooseCultDialog(
    actorCults: { name: string | null; id: string | null }[],
    runeMagicName: string,
    actorName: string,
  ): Promise<string> {
    const htmlContent = await foundry.applications.handlebars.renderTemplate(
      templatePaths.dialogRuneMagicCult,
      {
        actorCults: actorCults,
        runeMagicName: runeMagicName,
        actorName: actorName,
      },
    );
    return await new Promise((resolve, reject) => {
      const dialog = new Dialog({
        title: localize("RQG.Item.RuneMagic.runeMagicCultDialog.title"),
        content: htmlContent,
        default: "submit",
        buttons: {
          submit: {
            icon: '<i class="fas fa-check"></i>',
            label: localize("RQG.Item.RuneMagic.runeMagicCultDialog.btnAddRuneMagic"),
            callback: (html: JQuery | HTMLElement) => {
              const selectedCultId = (html as JQuery).find("[name=cultId]").val() as string;
              resolve(selectedCultId);
            },
          },
          cancel: {
            label: localize("RQG.Dialog.Common.btnCancel"),
            icon: '<i class="fas fa-times"></i>',
            callback: () => {
              reject();
            },
          },
        },
      });
      dialog.render(true);
    });
  }
}
