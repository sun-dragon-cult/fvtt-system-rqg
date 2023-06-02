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
  item: string; // id
  name: string;
  documentRqidFlags: DocumentRqidFlags;
  actor?: string; // id
  token?: string; // id
  scene?: string; // id
}

type MissingNames = { [name: string]: string };
type FoundKeys = { [name: string]: string };

// TODO split into init and "sheetData"
interface RqidBatchEditorData {
  foundKeys: FoundKeys;
  idPrefix: string;
  missingNames: MissingNames;
  prefixRegex: RegExp | null;
  itemType: ItemTypeEnum;
  updateList: UpdateList[];
  resolve: (value: unknown) => void;
  summary?: string;
}

export class RqidBatchEditor extends FormApplication<
  FormApplication.Options,
  FormApplication.Data<RqidBatchEditorData>,
  RqidBatchEditorData
> {
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

  async getData(): Promise<FormApplication.Data<RqidBatchEditorData>> {
    const sheetData = super.getData() as RqidBatchEditorData &
      FormApplication.Data<RqidBatchEditorData>; // TODO ugly as *****************
    sheetData.foundKeys = Object.keys(sheetData.object.foundKeys)
      .reduce((out: any, key) => {
        out.push({ name: key, key: sheetData.object.foundKeys[key] });
        return out;
      }, [])
      .sort((a: Document<any, any>, b: Document<any, any>) => a.name!.localeCompare(b.name!));
    sheetData.missingNames = Object.keys(sheetData.object.missingNames)
      .reduce((out: any, key) => {
        out.push({
          key: sheetData.object.foundKeys[key] ?? "",
          name: key,
          custom: sheetData.object.missingNames[key],
          suffix: sheetData.object.missingNames[key].replace(this.object.prefixRegex ?? "", ""),
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
    this.object.missingNames[name] = convertFormValueToString(event.currentTarget.value);
    this.render(true);
  }

  onClickGuess(event: any) {
    const name = getDomDataset(event, "name") ?? "";
    this.object.missingNames[name] = this.object.idPrefix + toKebabCase(name);
    this.render(true);
  }

  onKeyupRqid(event: any) {
    const name = getDomDataset(event, "name") ?? "";
    this.object.missingNames[name] =
      this.object.idPrefix + convertFormValueToString(event.currentTarget.value);
  }

  async _updateObject(event: any, formData: any) {
    if (event.submitter) {
      // TODO checks if the form was submitted - better way to do it?
      if (this.object.itemType === ItemTypeEnum.Skill) {
        // TODO Item is Skill check - why
        this.close();
        await RqidBatchEditor.processSkillKeys(this.object.updateList, this.object.missingNames);
      }
      this.object.resolve(true);
    }
  }

  static async processSkillKeys(updateList: UpdateList[], missingNames: MissingNames) {
    const items: any[] = [];
    const actors: any = {};
    const scenes: any = {};
    for (const update of updateList) {
      update.documentRqidFlags.id = missingNames[update.name]; // TODO *********************** id on undefined
      if (typeof update.documentRqidFlags.lang === "undefined") {
        update.documentRqidFlags.lang = getGame().i18n.lang; // TODO Use world language !!!
      }
      if (typeof update.documentRqidFlags.priority === "undefined") {
        update.documentRqidFlags.priority = 0;
      }
      const flags = flattenObject({
        flags: { rqg: { documentRqidFlags: update.documentRqidFlags } },
      }); // TODO !!!
      if (typeof update.scene !== "undefined") {
        if (typeof scenes[update.scene] === "undefined") {
          const scene = getGame().scenes?.get(update.scene); // TODO Maybe Undefined
          scenes[update.scene] = scene?.toObject();
        }
        const tokenOffset = scenes[update.scene].tokens.findIndex(
          (t: TokenDocument) => t._id === update.token
        );
        if (tokenOffset > -1) {
          // TODO Added "contents" ***
          const itemOffset = scenes[update.scene].tokens[tokenOffset].actorData.items.findIndex(
            (i: any) => i._id === update.item
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
            scenes[update.scene].tokens[tokenOffset].actorData.items[itemOffset] = mergeObject(
              scenes[update.scene].tokens[tokenOffset].actorData.items[itemOffset],
              expandedFlags
            );
          }
        }
      } else if (typeof update.actor !== "undefined") {
        if (typeof actors[update.actor] === "undefined") {
          actors[update.actor] = [];
        }
        const item: any = {
          _id: update.item,
        };
        for (const key of Object.keys(flags)) {
          if (key.match(/^flags\.rqg\.documentRqidFlags/)) {
            item[key] = flags[key];
          }
        }
        actors[update.actor].push(item);
      } else {
        const item: any = {
          _id: update.item,
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
    missingNames: MissingNames,
    foundKeys: FoundKeys,
    documentType: ItemTypeEnum,
    prefixRegex: RegExp
  ): Promise<void> {
    // TODO Collect Rqids from compendium packs

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
            foundKeys[itemData.name] = itemData.flags.rqg.documentRqidFlags.id;
          } else {
            missingNames[itemData.name] = missingNames[itemData.name] ?? "";
            updateList.push({
              actor: actor._id ?? undefined,
              item: itemData._id,
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
          foundKeys[itemData.name] = itemData.flags.rqg.documentRqidFlags.id;
        } else {
          missingNames[itemData.name] = missingNames[itemData.name] ?? "";
          updateList.push({
            item: itemData._id,
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
                foundKeys[itemData.name] = itemData.flags.rqg.documentRqidFlags.id;
              } else {
                missingNames[itemData.name] = missingNames[itemData.name] ?? "";
                updateList.push({
                  scene: sceneData._id,
                  token: token._id ?? undefined,
                  item: itemData._id,
                  name: itemData.name,
                  documentRqidFlags: itemData.flags.rqg?.documentRqidFlags ?? {},
                });
              }
            }
          });
        }
      });
    });

    if (Object.keys(missingNames).filter((key) => missingNames[key] === "").length > 0) {
      const items: any = await Rqid.fromRqidRegexBest(
        prefixRegex,
        "i",
        // Rqid.rqidDocumentNameLookup[documentType], // TODO documentType är "skill" och lookupen vill ha "Item" - hårdkoda "i" för nu? eller hur veta
        "en"
      );
      items.forEach((item: any) => {
        foundKeys[item.name ?? ""] = item.flags.rqg.documentRqidFlags.id;
      });

      for (const name in missingNames) {
        if (typeof foundKeys[name] !== "undefined") {
          missingNames[name] = foundKeys[name];
        }
      }
    }
  }

  static async create(documentType: ItemTypeEnum): Promise<RqidBatchEditorData | boolean> {
    const updateList: UpdateList[] = [];
    const missingNames: MissingNames = {}; // TODO should be Map ? (item name -> rqid) - man kan få med definerad rqid om exakt match på namn men itemet saknar rqid
    const foundKeys: FoundKeys = {}; // TODO should be Map ? (item name -> rqid)
    const documentName = "Item"; // Only Items supported for now
    const rqidDocumentName = Rqid.rqidDocumentNameLookup[documentName]; // TODO revert making it public and hardcode "i"

    const idPrefix = `${rqidDocumentName}.${documentType}.`;
    const prefixRegex = new RegExp("^" + rqidDocumentName + "\\." + documentType + "\\.");

    await RqidBatchEditor.populateSkillKeys(
      updateList,
      missingNames,
      foundKeys,
      documentType,
      prefixRegex
    );
    if (
      // @ts-expect-errors isEmpty  Are there any document without rqid to show?
      foundry.utils.isEmpty(missingNames)
      // Object.keys(missingNames).some((key) => foundry.utils.isEmpty(missingNames[key]))
    ) {
      await RqidBatchEditor.processSkillKeys(updateList, missingNames); // TODO Varför ?
      return true;
    }
    return new Promise((resolve: (value: any) => void): void => {
      const rqidBatchEditor = new RqidBatchEditor({
        itemType: documentType,
        idPrefix,
        prefixRegex,
        updateList,
        missingNames,
        foundKeys,
        resolve,
      });
      rqidBatchEditor.render(true);
    });
  }
}
