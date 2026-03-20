import type { RqgActorSheetV2Context } from "./rqgActorSheetV2.types";
import type {
  CharacterActor,
  CharacterDataPropertiesData,
} from "../data-model/actor-data/rqgActorData";
import { ActorTypeEnum } from "../data-model/actor-data/rqgActorData";
import { systemId } from "../system/config";
import { assertDocumentSubType } from "../system/util";
import { templatePaths } from "../system/loadHandlebarsTemplates";
import * as DataPrep from "./rqgActorSheetDataPrep";
import { RqidLink } from "../data-model/shared/rqidLink";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const DocumentSheetV2 = foundry.applications.api.DocumentSheetV2;

export class RqgActorSheetV2 extends HandlebarsApplicationMixin(DocumentSheetV2<any>) {
  get actor(): CharacterActor {
    return this.document as CharacterActor;
  }

  static override DEFAULT_OPTIONS: Record<string, any> = {
    id: "{id}",
    classes: [systemId, "sheet", "character", "actor-sheet-v2"],
    position: {
      width: 900,
      height: 700,
    },
    form: {
      handler: RqgActorSheetV2.onSubmit,
      submitOnChange: true,
      closeOnSubmit: false,
    },
    window: {
      resizable: true,
    },
  };

  static override PARTS: Record<string, any> = {
    header: { template: templatePaths.actorSheetV2Header },
    nav: { template: templatePaths.actorSheetV2Nav },
    placeholder: { template: templatePaths.actorSheetV2Placeholder, scrollable: [""] },
  };

  override get title(): string {
    const linked = this.actor.prototypeToken?.actorLink;
    const isToken = this.actor.isToken;

    let prefix = "";
    if (!linked) {
      prefix = isToken ? "[Token] " : "[Prototype] ";
    }
    const speakerName = isToken ? this.actor.token!.name : this.actor.prototypeToken.name;
    const postfix = isToken ? ` (${this.actor.prototypeToken.name})` : "";

    return prefix + speakerName + postfix;
  }

  // @ts-expect-error Return type is intentionally narrowed from the fvtt-types RenderContext
  override async _prepareContext(): Promise<RqgActorSheetV2Context> {
    assertDocumentSubType<CharacterActor>(this.actor, ActorTypeEnum.Character);
    const system = foundry.utils.duplicate(this.actor.system) as CharacterDataPropertiesData;
    const spiritMagicPointSum = DataPrep.getSpiritMagicPointSum(this.actor);
    const embeddedItems = await DataPrep.organizeEmbeddedItems(this.actor, []);

    return {
      id: this.actor.id ?? "",
      uuid: this.actor.uuid,
      name: this.actor.name ?? "",
      img: this.actor.img ?? "",
      isGM: game.user?.isGM ?? false,
      isEditable: this.isEditable,
      isEmbedded: false,
      isV2: true,
      system: system,
      effects: [...this.actor.allApplicableEffects()],

      embeddedItems: embeddedItems,

      mainCult: DataPrep.getMainCultInfo(this.actor),
      characterElementRunes: DataPrep.getCharacterElementRuneImgs(this.actor),
      characterPowerRunes: DataPrep.getCharacterPowerRuneImgs(this.actor),
      characterFormRunes: DataPrep.getCharacterFormRuneImgs(this.actor),

      baseStrikeRank: DataPrep.getBaseStrikeRank(
        system.attributes.dexStrikeRank,
        system.attributes.sizStrikeRank,
      ),

      spiritMagicPointSum: spiritMagicPointSum,
      freeInt: DataPrep.getFreeInt(this.actor, spiritMagicPointSum),
      powCrystals: DataPrep.getPowCrystals(this.actor),

      enrichedBiography: await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        system.background.biography ?? "",
      ),
      enrichedAllies: await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        system.allies,
      ),

      // Header-specific data
      showCharacteristicRatings:
        (game.settings?.get(systemId, "showCharacteristicRatings") as boolean) || false,
      characteristicRanks: await DataPrep.rankCharacteristics(this.actor),
      powWarning: DataPrep.getPowWarning(this.actor),
      editMode: system.editMode,
    };
  }

  override async _preparePartContext(partId: string, context: any, options: any): Promise<any> {
    context = await super._preparePartContext(partId, context, options);
    context.tab = context.tabs?.[partId] ?? { active: false, id: partId, group: "sheet" };
    return context;
  }

  /** Remembers the currently active tab across re-renders */
  protected _currentTab: string | undefined;

  override async _onRender(context: any, options: any): Promise<void> {
    await super._onRender(context, options);

    // Tab navigation (preserves active tab across re-renders)
    const navEl = this.element.querySelector("nav.sheet-tabs");
    if (navEl) {
      const tabs = new foundry.applications.ux.Tabs({
        navSelector: "nav.sheet-tabs",
        contentSelector: ".sheet-body",
        initial: this._currentTab ?? "combat",
        callback: (_event: MouseEvent | null, _tabs: unknown, name: string) => {
          if (name) {
            this._currentTab = name;
          }
        },
      });
      tabs.bind(this.element);
    }

    // RQID link click handlers
    void RqidLink.addRqidLinkClickHandlersToJQuery($(this.element));

    // Profile image click to open FilePicker (AppV2 convention: data-action)
    if (options.isFirstRender) {
      this.element.querySelectorAll<HTMLElement>("[data-action='editImage']").forEach((el) => {
        el.addEventListener("click", () => {
          const current = this.actor.img;
          const fp = new FilePicker({
            type: "image",
            current: current ?? undefined,
            callback: async (path: string) => {
              await this.actor.update({ img: path });
            },
          });
          fp.browse();
        });
      });
    }
  }

  protected static async onSubmit(
    _event: SubmitEvent | Event,
    _form: HTMLFormElement,
    formData: foundry.applications.ux.FormDataExtended,
  ): Promise<void> {
    const sheet = this as unknown as RqgActorSheetV2;
    const data = formData.object as Record<string, unknown>;
    await sheet.actor.update(data);
  }
}
