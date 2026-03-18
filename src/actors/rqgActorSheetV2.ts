import * as DataPrep from "./rqgActorSheetDataPrep";
import {
  type CharacterActor,
  type CharacterDataPropertiesData,
} from "../data-model/actor-data/rqgActorData";
import { systemId } from "../system/config";
import { templatePaths } from "../system/loadHandlebarsTemplates";
import type { RqgActorSheetV2Context } from "./rqgActorSheetV2.types";
import { addRqidLinkToSheet } from "../documents/rqidSheetButton";
import { RqidLink } from "../data-model/shared/rqidLink";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const DocumentSheetV2 = foundry.applications.api.DocumentSheetV2;

export class RqgActorSheetV2 extends HandlebarsApplicationMixin(DocumentSheetV2<any>) {
  /** Remembers the currently active tab across re-renders. */
  protected _currentTab: string | undefined;

  override get document(): CharacterActor {
    return super.document as CharacterActor;
  }

  static override DEFAULT_OPTIONS: Record<string, any> = {
    id: "{id}",
    classes: [systemId, "actor-sheet", "sheet", "character"],
    position: { width: 960, height: 800 },
    form: {
      handler: RqgActorSheetV2.onSubmit,
      submitOnChange: true,
      closeOnSubmit: false,
    },
    window: { resizable: true },
  };

  static override PARTS: Record<string, any> = {
    header: { template: templatePaths.actorCharacterSheetV2Header },
    tabs: { template: "templates/generic/tab-navigation.hbs" },
    characteristics: {
      template: templatePaths.actorCharacterSheetV2Characteristics,
      scrollable: [""],
    },
    combat: { template: templatePaths.actorCharacterSheetV2Combat, scrollable: [""] },
    skills: { template: templatePaths.actorCharacterSheetV2Skills, scrollable: [""] },
    magic: { template: templatePaths.actorCharacterSheetV2Magic, scrollable: [""] },
    background: { template: templatePaths.actorCharacterSheetV2Background, scrollable: [""] },
    effects: { template: templatePaths.actorCharacterSheetV2Effects, scrollable: [""] },
  };

  static override TABS: Record<string, any> = {
    sheet: {
      tabs: [
        { id: "characteristics", label: "RQG.Actor.SheetTab.Characteristics" },
        { id: "combat", label: "RQG.Actor.SheetTab.Combat" },
        { id: "skills", label: "RQG.Actor.SheetTab.Skills" },
        { id: "magic", label: "RQG.Actor.SheetTab.Magic" },
        { id: "background", label: "RQG.Actor.SheetTab.Background" },
        { id: "effects", label: "RQG.Actor.SheetTab.ActiveEffects" },
      ],
      initial: "characteristics",
      labelPrefix: null,
    },
  };

  override get title(): string {
    return `${this.document.name ?? ""}`;
  }

  // @ts-expect-error Return type is intentionally narrowed from the fvtt-types RenderContext
  override async _prepareContext(): Promise<RqgActorSheetV2Context> {
    const system = foundry.utils.duplicate(this.document.system) as CharacterDataPropertiesData;
    const spiritMagicPointSum = DataPrep.getSpiritMagicPointSum(this.document);
    const embeddedItems = await DataPrep.organizeEmbeddedItems(this.document, []);

    const context: RqgActorSheetV2Context = {
      id: this.document.id ?? "",
      uuid: this.document.uuid,
      name: this.document.name ?? "",
      img: this.document.img ?? "",
      isGM: game.user?.isGM ?? false,
      isEditable: this.isEditable,
      isEmbedded: this.document.isEmbedded,
      isV2: true,
      system: system,
      effects: [...this.document.allApplicableEffects()],

      embeddedItems: embeddedItems as any,
      mainCult: DataPrep.getMainCultInfo(this.document),
      characterElementRunes: DataPrep.getCharacterElementRuneImgs(this.document),
      characterPowerRunes: DataPrep.getCharacterPowerRuneImgs(this.document),
      characterFormRunes: DataPrep.getCharacterFormRuneImgs(this.document),

      baseStrikeRank: DataPrep.getBaseStrikeRank(
        system.attributes.dexStrikeRank,
        system.attributes.sizStrikeRank,
      ),
      spiritMagicPointSum: spiritMagicPointSum,
      freeInt: DataPrep.getFreeInt(this.document, spiritMagicPointSum),
      powCrystals: DataPrep.getPowCrystals(this.document),

      enrichedBiography: await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        system.background.biography ?? "",
      ),
      enrichedAllies: await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        system.allies,
      ),
    };

    if (!context.isGM && this.tabGroups?.["sheet"] === "effects") {
      this.tabGroups["sheet"] = RqgActorSheetV2.TABS["sheet"].initial;
    }

    (context as any).tabs = this._prepareTabs("sheet");

    if (!context.isGM) {
      delete (context as any).tabs.effects;
    }

    return context;
  }

  // Always set context.tab so hidden parts don't inherit the previous part's active tab.
  override async _preparePartContext(partId: string, context: any, options: any): Promise<any> {
    context = await super._preparePartContext(partId, context, options);
    context.tab = context.tabs?.[partId] ?? { active: false, id: partId, group: "sheet" };
    return context;
  }

  override async _onRender(context: any, options: any): Promise<void> {
    await super._onRender(context, options);

    // Tab navigation (preserves active tab across re-renders)
    if (this.element.querySelector(".actor-sheet-nav-tabs")) {
      const tabs = new foundry.applications.ux.Tabs({
        navSelector: ".actor-sheet-nav-tabs",
        contentSelector: ".sheet-body",
        initial: this._currentTab,
        callback: (_event: MouseEvent | null, _tabs: unknown, name: string) => {
          if (name) {
            this._currentTab = name;
          }
        },
      });
      tabs.bind(this.element);
    }

    // RQID header button (AppV2 version)
    await addRqidLinkToSheet(this as unknown as DocumentSheet<any, any>);

    // RQID link click handlers in the sheet body
    void RqidLink.addRqidLinkClickHandlersToJQuery($(this.element));
  }

  /**
   * Default form submit handler — saves the document.
   */
  protected static async onSubmit(
    _event: SubmitEvent | Event,
    _form: HTMLFormElement,
    formData: foundry.applications.ux.FormDataExtended,
  ): Promise<void> {
    await (this as unknown as RqgActorSheetV2).document.update(formData.object);
  }
}
