import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { CultRankEnum } from "../../data-model/item-data/cultData";
import {
  getGameUser,
  AvailableItemCache,
  isTruthy,
  getRequiredDomDataset,
  formatListByWorldLanguage,
  getSelectRuneOptions,
} from "../../system/util";
import { RqgItemSheet } from "../RqgItemSheet";
import type { RqgItem } from "../rqgItem";
import { systemId } from "../../system/config";
import type { ItemSheetData } from "../shared/sheetInterfaces";
import { templatePaths } from "../../system/loadHandlebarsTemplates";

interface CultSheetData {
  allRuneOptions: AvailableItemCache[];
  ranksEnum: CultRankEnum[];
  enrichedGifts: string;
  enrichedGeases: string;
  enrichedSubCults: string;
  enrichedHolyDays: string;
}

export class CultSheet extends RqgItemSheet<ItemSheet.Options, CultSheetData | ItemSheet.Data> {
  static get defaultOptions(): ItemSheet.Options {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: [systemId, "item-sheet", "sheet", ItemTypeEnum.Cult],
      template: templatePaths.itemCultSheet,
      width: 450,
      height: 500,
      tabs: [
        {
          navSelector: ".item-sheet-nav-tabs",
          contentSelector: ".sheet-body",
          initial: "deity",
        },
      ],
    });
  }

  async getData(): Promise<CultSheetData & ItemSheetData> {
    // @ts-expect-error _source Read from the original data unaffected by any AEs
    const system = foundry.utils.duplicate(this.document._source.system);

    // To improve UX of creating a new item, set deity to name if empty
    if (!system.deity) {
      system.deity = this.document.name;
    }

    return {
      id: this.document.id ?? "",
      uuid: this.document.uuid,
      name: this.document.name ?? "",
      img: this.document.img ?? "",
      isEditable: this.isEditable,
      isEmbedded: this.document.isEmbedded,
      isGM: getGameUser().isGM,
      system: system,
      enrichedGifts: await TextEditor.enrichHTML(system.gifts),
      enrichedGeases: await TextEditor.enrichHTML(system.geases),
      enrichedSubCults: await TextEditor.enrichHTML(system.subCults),
      enrichedHolyDays: await TextEditor.enrichHTML(system.holyDays),
      // journalEntryName: system.descriptionRqidLink.name,
      ranksEnum: Object.values(CultRankEnum),
      allRuneOptions: getSelectRuneOptions("RQG.Item.Cult.AddCultRunePlaceholder"),
    };
  }

  protected _updateObject(event: Event, formData: any): Promise<RqgItem | undefined> {
    const formCultName = formData["system.joinedCults.cultName"];
    const formTagLine = formData["system.joinedCults.tagline"];
    const formrank = formData["system.joinedCults.rank"];

    let cultNames = Array.isArray(formCultName) ? formCultName : [formCultName];
    const taglines = Array.isArray(formTagLine) ? formTagLine : [formTagLine];
    const ranks = Array.isArray(formrank) ? formrank : [formrank];

    cultNames = cultNames.map((name) => name || formData["system.deity"]); // Prefill cultName with deity name is empty

    // Depends on that rank is never empty
    formData["system.joinedCults"] = ranks.map((rank: any, index: number) => ({
      cultName: cultNames[index],
      tagline: taglines[index],
      rank: rank,
    }));

    formData["name"] = CultSheet.deriveItemName(formData["system.deity"], cultNames);

    return super._updateObject(event, formData);
  }

  activateListeners(html: JQuery) {
    super.activateListeners(html);

    // add another cult
    html[0]?.querySelectorAll<HTMLElement>("[data-add-cult]").forEach((el) => {
      el.addEventListener("click", async () => {
        this.document.system.joinedCults.push({
          rank: CultRankEnum.LayMember,
        });
        await this.document.update({
          system: { joinedCults: this.document.system.joinedCults },
        });
      });
    });

    // delete a cult
    html[0]?.querySelectorAll<HTMLElement>("[data-delete-cult]").forEach((el) => {
      el.addEventListener("click", async () => {
        const indexToDelete = getRequiredDomDataset(el, "delete-cult");

        this.document.system.joinedCults.splice(indexToDelete, 1);
        const newName = this.deriveItemName();
        await this.document.update({
          name: newName,
          system: { joinedCults: this.document.system.joinedCults },
        });
      });
    });
  }

  deriveItemName(): string {
    return CultSheet.deriveItemName(
      this.document.system.deity,
      this.document.system.joinedCults.map((c: any) => c.cultName),
    );
  }

  static deriveItemName(deity: string, cultNames: string[]): string {
    const joinedCultsFormatted = formatListByWorldLanguage(
      cultNames.filter(isTruthy).map((c) => c.trim()),
    );

    if (!joinedCultsFormatted || joinedCultsFormatted === deity) {
      return deity.trim();
    }
    return joinedCultsFormatted + ` (${deity.trim()})`;
  }
}
