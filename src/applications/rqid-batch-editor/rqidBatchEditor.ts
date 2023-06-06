import { systemId } from "../../system/config.js";
import {
  convertFormValueToString,
  getDomDataset,
  getGame,
  localize,
  localizeItemType,
  toKebabCase,
} from "../../system/util";
import { Rqid } from "../../system/api/rqidApi";
import type { Document } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/abstract/module.mjs";
import { ItemTypeEnum } from "../../data-model/item-data/itemTypes";
import { DocumentRqidFlags } from "../../data-model/shared/rqgDocumentFlags";

interface UpdateList {
  itemId: string;
  name: string;
  documentRqidFlags: DocumentRqidFlags;
  actorId?: string;
  tokenId?: string;
  sceneId?: string;
}

// TODO split data into init and "sheetData"
interface RqidBatchEditorData {
  existingRqids: Map<string, string>; // item name -> rqid
  itemNamesWithoutRqid: Map<string, string | undefined>; // item name -> rqid
  idPrefix: string;
  prefixRegex: RegExp | null;
  itemType: ItemTypeEnum;
  updateList: UpdateList[];
  summary?: string;
}

export class RqidBatchEditor extends FormApplication<
  FormApplication.Options,
  FormApplication.Data<RqidBatchEditorData>,
  RqidBatchEditorData
> {
  public resolve: (value: PromiseLike<void> | void) => void = () => {};
  public reject: (value: PromiseLike<void> | void) => void = () => {};

  public getPromise(): RqidBatchEditor {
    return this;
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: [systemId, "form", "rqid-batch-editor"],
      popOut: true,
      template: `systems/rqg/applications/rqid-batch-editor/rqidBatchEditor.hbs`,
      width: 900,
      id: "rqid-batch-editor-application",
      title: "RQG.Dialog.BatchRqidEditor.Title",
      closeOnSubmit: false,
      submitOnClose: false,
      submitOnChange: false,
      resizable: true,
    });
  }

  async close(options?: FormApplication.CloseOptions): Promise<void> {
    await super.close(options);
    this.resolve();
  }

  async getData(): Promise<FormApplication.Data<RqidBatchEditorData>> {
    // TODO ugly as *****************
    const sheetData = super.getData() as RqidBatchEditorData &
      FormApplication.Data<RqidBatchEditorData>;
    sheetData.existingRqids = [...sheetData.object.existingRqids.keys()]
      .reduce((out: any, itemName) => {
        out.push({
          name: itemName,
          key: sheetData.object.existingRqids.get(itemName),
          optionValue: itemName,
        });
        return out;
      }, [])
      .sort((a: Document<any, any>, b: Document<any, any>) => a.name!.localeCompare(b.name!));

    sheetData.itemNamesWithoutRqid = [...sheetData.object.itemNamesWithoutRqid.keys()]
      .reduce((out: any, itemName) => {
        out.push({
          name: itemName, // Name
          key: sheetData.object.existingRqids.get(itemName) ?? "",
          custom: sheetData.object.itemNamesWithoutRqid.get(itemName), // Rqid if name match
          suffix: sheetData.object.itemNamesWithoutRqid // rqidSuffix if name match
            .get(itemName)
            ?.replace(this.object.prefixRegex ?? "", ""),
        });
        return out;
      }, [])
      .sort((a: Document<any, any>, b: Document<any, any>) => a.name!.localeCompare(b.name!));
    const documentNameTranslation = localizeItemType(this.object.itemType as ItemTypeEnum);
    sheetData.summary = localize("RQG.Dialog.BatchRqidEditor.Summary", {
      type: documentNameTranslation,
    });
    return sheetData;
  }

  activateListeners(html: JQuery) {
    super.activateListeners(html);
    html.find(".existing").change(this.onSetExistingName.bind(this));
    html.find(".generate-rqid").click(this.onClickGuess.bind(this));
    html.find("input").keyup(this.onKeyupRqid.bind(this));
  }

  onSetExistingName(event: any) {
    const name = getDomDataset(event, "name") ?? "";
    this.object.itemNamesWithoutRqid.set(name, convertFormValueToString(event.currentTarget.value));
    this.render(true);
  }

  onClickGuess(event: any) {
    const name = getDomDataset(event, "name") ?? "";
    this.object.itemNamesWithoutRqid.set(name, this.object.idPrefix + toKebabCase(name));
    this.render(true);
  }

  onKeyupRqid(event: any) {
    const name = getDomDataset(event, "name") ?? "";
    this.object.itemNamesWithoutRqid.set(
      name,
      this.object.idPrefix + toKebabCase(convertFormValueToString(event.currentTarget.value))
    );
  }

  async _updateObject(event: any, formData: any) {
    if (event instanceof SubmitEvent) {
      this.close();
      await RqidBatchEditor.processSkillKeys(
        this.object.updateList,
        this.object.itemNamesWithoutRqid
      );
      // this.object.resolve(true);
    }
  }

  get title(): string {
    return super.title + " - " + localizeItemType(this.object.itemType);
  }

  // TODO Rename to updateXxx (find a good name)
  static async processSkillKeys(
    updateList: UpdateList[],
    missingNames: Map<string, string | undefined>
  ) {
    const items: any[] = [];
    const actors: any = {};
    const scenes: any = {};
    for (const update of updateList) {
      update.documentRqidFlags.id = missingNames.get(update.name);
      if (typeof update.documentRqidFlags.lang === "undefined") {
        update.documentRqidFlags.lang = getGame().settings.get(systemId, "worldLanguage");
      }
      if (typeof update.documentRqidFlags.priority === "undefined") {
        update.documentRqidFlags.priority = 0;
      }
      const flags = flattenObject({
        flags: { rqg: { documentRqidFlags: update.documentRqidFlags } },
      }); // TODO !!!
      if (typeof update.sceneId !== "undefined") {
        if (typeof scenes[update.sceneId] === "undefined") {
          const scene = getGame().scenes?.get(update.sceneId); // TODO Maybe Undefined
          scenes[update.sceneId] = scene?.toObject();
        }
        const tokenOffset = scenes[update.sceneId].tokens.findIndex(
          (t: TokenDocument) => t._id === update.tokenId
        );
        if (tokenOffset > -1) {
          // TODO Added "contents" ***
          const itemOffset = scenes[update.sceneId].tokens[tokenOffset].actorData.items.findIndex(
            (i: any) => i._id === update.itemId
          );
          if (itemOffset > -1) {
            const expandedFlags = expandObject(
              Object.entries(flags).reduce((out: any, entry) => {
                if (entry[0].match(/^flags\.rqg\.documentRqidFlags/)) {
                  out[entry[0]] = entry[1];
                }
                return out;
              }, {})
            );
            scenes[update.sceneId].tokens[tokenOffset].actorData.items[itemOffset] = mergeObject(
              scenes[update.sceneId].tokens[tokenOffset].actorData.items[itemOffset],
              expandedFlags
            );
          }
        }
      } else if (typeof update.actorId !== "undefined") {
        if (typeof actors[update.actorId] === "undefined") {
          actors[update.actorId] = [];
        }
        const item: any = {
          _id: update.itemId,
        };
        for (const key of Object.keys(flags)) {
          if (key.match(/^flags\.rqg\.documentRqidFlags/)) {
            item[key] = flags[key];
          }
        }
        actors[update.actorId].push(item);
      } else {
        const item: any = {
          _id: update.itemId,
        };
        for (const key of Object.keys(flags)) {
          if (key.match(/^flags\.rqg\.documentRqidFlags/)) {
            item[key] = flags[key];
          }
        }
        items.push(item);
      }
    }
    if (items.length) {
      await Item.updateDocuments(items);
    }
    if (Object.keys(actors).length) {
      for (const actorId of Object.keys(actors)) {
        await Item.updateDocuments(actors[actorId], { parent: getGame().actors?.get(actorId) });
      }
    }
    if (Object.keys(scenes).length) {
      for (const sceneId of Object.keys(scenes)) {
        const scene = getGame().scenes?.get(sceneId);
        scene?.update(scenes[sceneId]);
      }
    }
    return true;
  }

  static async populateSkillKeys(
    updateList: UpdateList[],
    itemNamesWithoutRqid: Map<string, string | undefined>,
    existingRqids: Map<string, string>,
    documentType: ItemTypeEnum,
    prefixRegex: RegExp
  ): Promise<void> {
    // Collect Rqids from system compendium packs
    const systemItemPacks = getGame().packs.filter(
      (p) =>
        // @ts-expect-error packageName
        p.metadata.packageName === systemId &&
        // @ts-expect-error type
        p.metadata.type === "Item" &&
        // @ts-expect-error packageType
        p.metadata.packageType === "system"
    );
    for (const pack of systemItemPacks) {
      const packIndex = await pack.getIndex();
      packIndex.forEach((packIndexData: any) => {
        if (packIndexData.type === documentType) {
          if (
            prefixRegex.test(packIndexData.flags.rqg?.documentRqidFlags?.id) &&
            // @ts-expect-error isEmpty
            !foundry.utils.isEmpty(packIndexData.flags.rqg?.documentRqidFlags?.id)
          ) {
            existingRqids.set(packIndexData.name, packIndexData?.flags.rqg.documentRqidFlags.id);
          } else {
            itemNamesWithoutRqid.set(packIndexData.name, undefined);
          }
        }
      });
    }

    // Collect Rqids from world Actors items
    const worldActors = getGame().actors?.contents ?? [];
    worldActors.forEach((actor) => {
      const actorData = actor.toObject();

      actorData.items.forEach((item) => {
        const itemData =
          item instanceof CONFIG.Item.documentClass ? (item as any).toObject() : item;
        if (itemData.type === documentType) {
          if (
            prefixRegex.test(itemData.flags.rqg?.documentRqidFlags?.id) &&
            // @ts-expect-error isEmpty
            !foundry.utils.isEmpty(itemData.flags.rqg?.documentRqidFlags?.id)
          ) {
            existingRqids.set(itemData.name, itemData.flags.rqg.documentRqidFlags.id);
          } else {
            itemNamesWithoutRqid.set(itemData.name, undefined);
            updateList.push({
              actorId: actor._id ?? undefined,
              itemId: itemData._id,
              name: itemData.name,
              documentRqidFlags: itemData.flags.rqg?.documentRqidFlags ?? {},
            });
          }
        }
      });
    });

    // Collect Rqids from world items
    const worldItems = getGame().items?.contents ?? [];
    worldItems.forEach((item) => {
      const itemData = item instanceof CONFIG.Item.documentClass ? (item as any).toObject() : item;
      if (itemData.type === documentType) {
        if (
          prefixRegex.test(itemData.flags.rqg?.documentRqidFlags?.id) &&
          // @ts-expect-error isEmpty
          !foundry.utils.isEmpty(itemData.flags.rqg?.documentRqidFlags?.id)
        ) {
          existingRqids.set(itemData.name, itemData.flags.rqg.documentRqidFlags.id);
        } else {
          itemNamesWithoutRqid.set(itemData.name, undefined);
          updateList.push({
            itemId: itemData._id,
            name: itemData.name,
            documentRqidFlags: itemData.flags.rqg?.documentRqidFlags ?? {},
          });
        }
      }
    });

    // Collect Rqids from Scene token actor items
    const worldScenes = getGame().scenes ?? [];
    worldScenes.forEach((scene) => {
      const sceneData = scene.toObject();
      const sceneTokens = sceneData.tokens ?? [];
      sceneTokens.forEach((token) => {
        if (token.actorId && !token.actorLink) {
          const actorData = duplicate(token.actorData);
          const actorItems = actorData.items ?? [];
          actorItems.forEach((item) => {
            const itemData =
              item instanceof CONFIG.Item.documentClass ? (item as any).toObject() : item;
            if (itemData.type === documentType) {
              if (
                prefixRegex.test(itemData.flags.rqg?.documentRqidFlags?.id) &&
                // @ts-expect-error isEmpty
                !foundry.utils.isEmpty(itemData.flags.rqg?.documentRqidFlags?.id)
              ) {
                existingRqids.set(itemData.name, itemData.flags.rqg.documentRqidFlags.id);
              } else {
                itemNamesWithoutRqid.set(itemData.name, undefined);
                updateList.push({
                  sceneId: sceneData._id,
                  tokenId: token._id ?? undefined,
                  itemId: itemData._id,
                  name: itemData.name,
                  documentRqidFlags: itemData.flags.rqg?.documentRqidFlags ?? {},
                });
              }
            }
          });
        }
      });
    });

    // Are there any missingNames without Rqid?
    if ([...itemNamesWithoutRqid.values()].some((v) => !v)) {
      // Fill existingRqids with Rqid from items
      const items: any = await Rqid.fromRqidRegexBest(prefixRegex, "i", "en");

      const namesToDeleteFromExistingRqids: Set<string> = new Set();
      items.forEach((item: any) => {
        const previousRqidSuffix = existingRqids.get(item.name)?.replace(prefixRegex, "");
        const previousExpandedName = `${item.name ?? ""} ➤ ${previousRqidSuffix}`;

        const newRqidSuffix = item.flags.rqg.documentRqidFlags.id?.replace(prefixRegex, "");
        const newExpandedName = `${item.name ?? ""} ➤ ${newRqidSuffix}`;

        if (
          // If foundKeys already has this item name but with another Rqid, then add the new one as well under a different name
          existingRqids.has(item.name) &&
          existingRqids.get(item.name) !== item.flags.rqg.documentRqidFlags.id
        ) {
          existingRqids.set(previousExpandedName, existingRqids.get(item.name)!);
          existingRqids.set(newExpandedName, item.flags.rqg.documentRqidFlags.id);
          namesToDeleteFromExistingRqids.add(item.name);
        }
      });

      // Remove the names without specification for names pointing to multiple Rqids
      namesToDeleteFromExistingRqids.forEach((k) => existingRqids.delete(k));

      // Prefill itemNamesWithoutRqid with Rqid from matching existingRqids
      for (const name of itemNamesWithoutRqid.keys()) {
        itemNamesWithoutRqid.set(name, existingRqids.get(name)!);
      }
    }
  }

  // Render the application and resolve a Promise when the application is closed so that it can be awaited
  public async show(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
      this.render(true);
    });
  }

  // Render the application in sequence for all provided item types
  static async factory(...itemTypes: ItemTypeEnum[]): Promise<void> {
    for (const itemType of itemTypes) {
      const updateList: UpdateList[] = [];
      const itemNamesWithoutRqid: Map<string, string> = new Map(); // TODO should be Map ? (item name -> rqid) - man kan få med definerad rqid om exakt match på namn men itemet saknar rqid
      const existingRqids: Map<string, string> = new Map();
      const documentName = "Item"; // Only Items supported for now
      const rqidDocumentName = Rqid.rqidDocumentNameLookup[documentName]; // TODO revert making it public and hardcode "i"

      const idPrefix = `${rqidDocumentName}.${toKebabCase(itemType)}.`;
      const prefixRegex = new RegExp(
        "^" + rqidDocumentName + "\\." + toKebabCase(itemType) + "\\."
      );

      await RqidBatchEditor.populateSkillKeys(
        updateList,
        itemNamesWithoutRqid,
        existingRqids,
        itemType,
        prefixRegex
      );
      if (
        // @ts-expect-errors isEmpty  Are there any document without rqid to show?
        foundry.utils.isEmpty(itemNamesWithoutRqid)
      ) {
        // await RqidBatchEditor.processSkillKeys(updateList, missingNames); // TODO Varför ?
        continue;
      }
      const rqidBatchEditor = new RqidBatchEditor({
        itemType,
        idPrefix,
        prefixRegex,
        updateList,
        itemNamesWithoutRqid: itemNamesWithoutRqid,
        existingRqids: existingRqids,
      });
      await rqidBatchEditor.show();
    }
  }
}
