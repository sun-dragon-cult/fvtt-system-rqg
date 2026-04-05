import type { RqgActorSheetV2Context } from "./rqgActorSheetV2.types";
import type {
  CharacterActor,
  CharacterDataPropertiesData,
} from "../data-model/actor-data/rqgActorData";
import { ActorTypeEnum } from "../data-model/actor-data/rqgActorData";
import { actorHealthStatuses } from "../data-model/actor-data/attributes";
import { RQG_CONFIG, systemId } from "../system/config";
import {
  assertDocumentSubType,
  getRequiredDomDataset,
  isTruthy,
  localize,
  range,
  requireValue,
  RqgError,
} from "../system/util";

import type { RqgItem } from "../items/rqgItem";
import type { AbilityItem, PhysicalItem } from "@item-model/itemTypes.ts";
import { abilityItemTypes, ItemTypeEnum } from "@item-model/itemTypes.ts";
import type { WeaponItem } from "@item-model/weaponData.ts";
import { HitLocationSheet } from "../items/hit-location-item/hitLocationSheet";
import {
  applyDamageBonusToFormula,
  formatDamagePart,
  getNormalizedDamageFormulaAndDamageBonus,
} from "../system/combatCalculations";
import { DamageRoll } from "../rolls/DamageRoll/DamageRoll";
import { templatePaths } from "../system/loadHandlebarsTemplates";
import * as DataPrep from "./rqgActorSheetDataPrep";
import { RqidLink } from "../data-model/shared/rqidLink";
import { addRqidLinkToSheet } from "../documents/rqidSheetButton";
import { RqgContextMenu } from "../foundryUi/RqgContextMenu";
import { HomeLandEnum, OccupationEnum } from "../data-model/actor-data/background";
import { characteristicMenuOptions } from "./context-menus/characteristic-context-menu";
import { combatMenuOptions } from "./context-menus/combat-context-menu";
import { cultMenuOptions } from "./context-menus/cult-context-menu";
import { hitLocationMenuOptions } from "./context-menus/hit-location-context-menu";
import { passionMenuOptions } from "./context-menus/passion-context-menu";
import { runeMenuOptions } from "./context-menus/rune-context-menu";
import { skillMenuOptions } from "./context-menus/skill-context-menu";
import { spiritMagicMenuOptions } from "./context-menus/spirit-magic-context-menu";
import { runeMagicMenuOptions } from "./context-menus/rune-magic-context-menu";
import { gearMenuOptions } from "./context-menus/gear-context-menu";
import {
  extractDropInfo,
  getAllowedDropDocumentNames,
  hasRqid,
  isAllowedDocumentNames,
  onDragEnter,
  onDragLeave,
  updateRqidLink,
} from "../documents/dragDrop";
import type { SpiritMagicItem } from "@item-model/spiritMagicData.ts";
import type { RuneMagicItem } from "@item-model/runeMagicData.ts";
import type { GearItem } from "@item-model/gearData.ts";
import { ActorWizard } from "../applications/actorWizardApplication";
import { actorWizardFlags } from "../data-model/shared/rqgDocumentFlags";
import {
  equippedStatuses,
  type EquippedStatus,
  physicalItemTypes,
} from "../data-model/item-data/IPhysicalItem";
import { ItemTree } from "../items/shared/ItemTree";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const ActorSheetV2 = foundry.applications.sheets.ActorSheetV2;

export class RqgActorSheetV2 extends HandlebarsApplicationMixin(ActorSheetV2) {
  #skillFilterQuery = "";

  override get actor(): CharacterActor {
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
    body: { template: templatePaths.actorSheetV2Body, scrollable: [""] },
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

  override _getHeaderControls(): any[] {
    const controls = super._getHeaderControls();
    const user = game.user;
    if (user?.isGM || user?.isTrusted) {
      const isEditMode = this.actor.system.editMode;
      controls.unshift({
        icon: isEditMode ? "play-mode-icon" : "edit-mode-icon",
        label: isEditMode
          ? localize("RQG.Actor.EditMode.SwitchToPlayMode")
          : localize("RQG.Actor.EditMode.SwitchToEditMode"),
        action: "toggleEditMode",
        // onClick is supported at runtime but not in the type definition
        onClick: () => {
          this.actor.update({ system: { editMode: !this.actor.system.editMode } });
        },
      } as any);
    }
    if (
      game.settings?.get(systemId, "actor-wizard-feature-flag") && // TODO remove when wizard is released
      !this.actor.getFlag(systemId, actorWizardFlags)?.actorWizardComplete &&
      !this.actor.getFlag(systemId, actorWizardFlags)?.isActorTemplate
    ) {
      controls.unshift({
        icon: "fas fa-user-edit",
        label: localize("RQG.ActorCreation.AdventurerCreationHeaderButton"),
        action: "openActorWizard",
        onClick: () => {
          new ActorWizard(this.actor, {}).render(true);
        },
      } as any);
    }
    return controls;
  }

  // @ts-expect-error Return type is intentionally narrowed from the fvtt-types RenderContext
  override async _prepareContext(): Promise<RqgActorSheetV2Context> {
    assertDocumentSubType<CharacterActor>(this.actor, ActorTypeEnum.Character);
    const system = foundry.utils.duplicate(this.actor.system) as CharacterDataPropertiesData;
    const spiritMagicPointSum = DataPrep.getSpiritMagicPointSum(this.actor);
    const incorrectRunes: any[] = [];
    const embeddedItems = await DataPrep.organizeEmbeddedItems(this.actor, incorrectRunes);
    const itemTree = new ItemTree(this.actor.items.contents);
    const uniqueGearItems = ((embeddedItems[ItemTypeEnum.Gear] ?? []) as GearItem[]).filter(
      (item) => foundry.utils.getProperty(item, "system.physicalItemType") === "unique",
    );
    const consumableGearItems = ((embeddedItems[ItemTypeEnum.Gear] ?? []) as GearItem[]).filter(
      (item) => foundry.utils.getProperty(item, "system.physicalItemType") === "consumable",
    );
    const currencyItems = (embeddedItems["currency"] ?? []) as GearItem[];
    const weaponItems = ((embeddedItems[ItemTypeEnum.Weapon] ?? []) as WeaponItem[]).filter(
      (item) => !foundry.utils.getProperty(item, "system.isNatural"),
    );
    const armorItems = (embeddedItems[ItemTypeEnum.Armor] ?? []) as RqgItem[];
    const dexStrikeRank = system.attributes.dexStrikeRank;
    const formRuneGroups = DataPrep.getRuneOpposedPairs(embeddedItems?.rune?.form ?? {});
    const showUiSection = DataPrep.getUiSectionVisibility(this.actor);
    // V2 does not currently render a Sorcery tab, so keep this flag aligned with
    // actual tab visibility for V2 template conditionals (e.g. rune-wheel pentagram).
    showUiSection.sorcery = false;

    // Compute active SRs from combat tracker
    const actorCombatants: Combatant[] | undefined = game.combat?.getCombatantsByActor(this.actor);
    this._activeInSR = new Set(
      actorCombatants
        ?.map((c) => c.initiative)
        .filter(isTruthy)
        .filter((sr: number) => sr >= 1 && sr <= 12),
    );

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
      itemLocationTree: itemTree.toSheetData(),
      locations: itemTree.getPhysicalItemLocations(),
      currencyTotals: DataPrep.calcCurrencyTotals(this.actor),
      itemLoopMessage: itemTree.loopMessage,
      gearView: {
        unique: uniqueGearItems,
        consumable: consumableGearItems,
        currency: currencyItems,
        weapon: weaponItems,
        armor: armorItems,
        hasUnique: uniqueGearItems.length > 0,
        hasConsumable: consumableGearItems.length > 0,
        hasCurrency: currencyItems.length > 0,
        hasWeapon: weaponItems.length > 0,
        hasArmor: armorItems.length > 0,
      },

      mainCult: DataPrep.getMainCultInfo(this.actor),
      characterElementRunes: DataPrep.getCharacterElementRuneImgs(this.actor),
      characterPowerRunes: DataPrep.getCharacterPowerRuneImgs(this.actor),
      characterFormRunes: DataPrep.getCharacterFormRuneImgs(this.actor),
      elementRuneVisuals: DataPrep.getRuneVisualsMap(embeddedItems?.rune?.element ?? {}),
      powerRunePairs: DataPrep.getRuneOpposedPairs(embeddedItems?.rune?.power ?? {}).pairs,
      formRunePairs: formRuneGroups.pairs,
      formRuneStandalone: formRuneGroups.standalone,

      baseStrikeRank: DataPrep.getBaseStrikeRank(dexStrikeRank, system.attributes.sizStrikeRank),

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

      // Combat tab data
      spiritCombatSkillData: this.actor.getBestEmbeddedDocumentByRqid(
        RQG_CONFIG.skillRqid.spiritCombat,
      ),
      dodgeSkillData: this.actor.getBestEmbeddedDocumentByRqid(RQG_CONFIG.skillRqid.dodge),
      loadedMissileSrDisplay: DataPrep.getLoadedMissileSrDisplay(dexStrikeRank),
      loadedMissileSr: DataPrep.getLoadedMissileSr(dexStrikeRank),
      unloadedMissileSrDisplay: DataPrep.getUnloadedMissileSrDisplay(dexStrikeRank),
      unloadedMissileSr: DataPrep.getUnloadedMissileSr(dexStrikeRank),
      ownedProjectileOptions: DataPrep.getEquippedProjectileOptions(this.actor),
      isInCombat: this.actor.inCombat,
      dexSR: [...range(1, dexStrikeRank ?? 0)],
      sizSR: [
        ...range(
          (dexStrikeRank ?? 0) + 1,
          (system.attributes.sizStrikeRank ?? 0) + (dexStrikeRank ?? 0),
        ),
      ],
      otherSR: [...range((dexStrikeRank ?? 0) + (system.attributes.sizStrikeRank ?? 0) + 1, 12)],
      activeInSR: [...this._activeInSR],
      bodyType: this.actor.getBodyType(),
      hitLocationDiceRangeError: DataPrep.getHitLocationDiceRangeError(this.actor),
      showUiSection: showUiSection,
      enrichedIncorrectRunes: await DataPrep.getIncorrectRunesText(
        this.actor,
        embeddedItems?.rune,
        incorrectRunes,
      ),
      enrichedUnspecifiedSkill: await DataPrep.getUnspecifiedSkillText(this.actor),

      // Background tab
      homelands: Object.values(HomeLandEnum),
      occupationOptions: Object.values(OccupationEnum).map((o) => ({
        value: o,
        label: o ? localize(`RQG.Actor.Background.Occupation.${o}`) : "",
      })),
      actorWizardFeatureFlag: game.settings?.get(systemId, "actor-wizard-feature-flag") ?? false,
    };
  }

  override async _preparePartContext(partId: string, context: any, options: any): Promise<any> {
    context = await super._preparePartContext(partId, context, options);
    context.tab = context.tabs?.[partId] ?? { active: false, id: partId, group: "sheet" };
    return context;
  }

  /** Remembers the currently active tab across re-renders */
  protected _currentTab: string | undefined;

  /** Remembers the currently active gear sub-tab across re-renders */
  protected _currentGearView: string | undefined;

  /** Tracks which SRs are active in combat for this actor */
  private _activeInSR: Set<number> = new Set<number>();

  override async _onRender(context: any, options: any): Promise<void> {
    await super._onRender(context, options);

    // Toggle edit-mode class for styling
    const isEditMode = !!this.actor.system.editMode;
    this.element.classList.toggle("edit-mode", isEditMode);

    // Toggle health state class (wounded, shock, unconscious, dead)
    const health = this.actor.system.attributes.health;
    for (const state of actorHealthStatuses) {
      this.element.classList.toggle(state, health === state);
    }

    // RQID header button (AppV2 version)
    await addRqidLinkToSheet(this as unknown as DocumentSheet<any, any>);

    // Update edit-mode header control icon and label
    const editControl = this.element.querySelector<HTMLElement>("[data-action='toggleEditMode']");
    if (editControl) {
      const icon = editControl.querySelector<HTMLElement>(".control-icon");
      const label = editControl.querySelector<HTMLElement>(".control-label");
      if (icon) {
        icon.className = `control-icon fa-fw ${isEditMode ? "play-mode-icon" : "edit-mode-icon"}`;
      }
      if (label) {
        label.textContent = isEditMode
          ? localize("RQG.Actor.EditMode.SwitchToPlayMode")
          : localize("RQG.Actor.EditMode.SwitchToEditMode");
      }
    }

    // Edit mode indicator in window header
    const header = this.element.querySelector(".window-header");
    let badge = header?.querySelector<HTMLElement>(".edit-mode-badge");
    if (isEditMode) {
      if (!badge && header) {
        badge = document.createElement("span");
        badge.className = "edit-mode-badge";
        badge.textContent = localize("RQG.Actor.EditMode.Badge");
        const toggleBtn = header.querySelector("[data-action='toggleControls']");
        toggleBtn?.insertAdjacentElement("beforebegin", badge);
      }
    } else {
      badge?.remove();
    }

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

    // Cult tab navigation (rune magic tab, only present when multiple cults)
    const cultNavEl = this.element.querySelector("nav.cult-tabs");
    if (cultNavEl) {
      const cultTabs = new foundry.applications.ux.Tabs({
        navSelector: ".cult-tabs",
        contentSelector: ".cult-body",
        initial: "",
      });
      cultTabs.bind(this.element);
    }

    // Gear tab sub-navigation (by item type / by location)
    const gearNavEl = this.element.querySelector("nav.gear-tabs");
    if (gearNavEl) {
      const gearTabs = new foundry.applications.ux.Tabs({
        navSelector: "nav.gear-tabs",
        contentSelector: ".gear-body",
        initial: this._currentGearView ?? "by-item-type",
        callback: (_event: MouseEvent | null, _tabs: unknown, name: string) => {
          if (name) {
            this._currentGearView = name;
          }
        },
      });
      gearTabs.bind(this.element);
    }

    // Context menus — all V2 menus use fixed (mouse-position) positioning
    const ctxMenuOptions = {
      fixed: true,
      onOpen: (target: HTMLElement) => target.classList.add("context-highlight"),
      onClose: (target: HTMLElement) => target.classList.remove("context-highlight"),
    };
    new RqgContextMenu(
      this.element,
      ".characteristic.contextmenu",
      characteristicMenuOptions(this.actor, this.document.token),
      ctxMenuOptions,
    );
    new RqgContextMenu(
      this.element,
      ".combat.contextmenu",
      combatMenuOptions(this.actor),
      ctxMenuOptions,
    );
    new RqgContextMenu(
      this.element,
      ".hit-location.contextmenu",
      hitLocationMenuOptions(this.actor),
      ctxMenuOptions,
    );
    new RqgContextMenu(
      this.element,
      ".rune.contextmenu",
      runeMenuOptions(this.actor, this.document.token ?? undefined),
      ctxMenuOptions,
    );
    new RqgContextMenu(
      this.element,
      ".cult.contextmenu",
      cultMenuOptions(this.actor),
      ctxMenuOptions,
    );
    new RqgContextMenu(
      this.element,
      ".skill.contextmenu",
      skillMenuOptions(this.actor, this.document.token ?? undefined),
      ctxMenuOptions,
    );
    new RqgContextMenu(
      this.element,
      ".passion.contextmenu",
      passionMenuOptions(this.actor, this.document.token ?? undefined),
      ctxMenuOptions,
    );
    new RqgContextMenu(
      this.element,
      ".spirit-magic.contextmenu",
      spiritMagicMenuOptions(this.actor),
      ctxMenuOptions,
    );
    new RqgContextMenu(
      this.element,
      ".rune-magic.contextmenu",
      runeMagicMenuOptions(this.actor),
      ctxMenuOptions,
    );
    new RqgContextMenu(
      this.element,
      ".gear.contextmenu",
      gearMenuOptions(this.actor),
      ctxMenuOptions,
    );

    // RQID link click handlers
    void RqidLink.addRqidLinkClickHandlersToJQuery($(this.element));

    // Delete handlers for RQID links (single link and link arrays)
    this.element.querySelectorAll<HTMLElement>("[data-delete-from-property]").forEach((el) => {
      const deleteRqid = getRequiredDomDataset(el, "delete-rqid");
      const deleteFromPropertyName = getRequiredDomDataset(el, "delete-from-property");
      el.addEventListener("click", async () => {
        const deleteFromProperty = foundry.utils.getProperty(
          this.actor.system as object,
          deleteFromPropertyName,
        );
        const updateKey = `system.${deleteFromPropertyName}`;
        if (Array.isArray(deleteFromProperty)) {
          const newValueArray = (deleteFromProperty as RqidLink[]).filter(
            (r) => r.rqid !== deleteRqid,
          );
          await this.actor.update({ [updateKey]: newValueArray });
        } else {
          await this.actor.update({ [updateKey]: "" });
        }
      });
    });

    // RQID dropzones (wizard background tab and any other dropzone-enabled fields)
    this.element.querySelectorAll<HTMLElement>("[data-dropzone]").forEach((elem) => {
      if (elem.dataset["rqidDropzoneBound"] === "true") {
        return;
      }
      elem.dataset["rqidDropzoneBound"] = "true";
      elem.addEventListener("dragenter", (event) => onDragEnter(event as DragEvent));
      elem.addEventListener("dragleave", (event) => onDragLeave(event as DragEvent));
      elem.addEventListener("dragover", (event) => event.preventDefault());
      elem.addEventListener("drop", (event) => {
        void this._onDropRqidDocument(event as DragEvent);
      });
    });

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

    // --- Combat tab event handlers ---

    // Set comma-separated Token SRs in Combat Tracker
    this.element.querySelectorAll<HTMLElement>("[data-set-sr]").forEach((el) => {
      const srValue = getRequiredDomDataset(el, "set-sr");
      const srToAdd = srValue.split(",").map((v) => Number(v.trim()));
      el.addEventListener("click", async () => {
        this._activeInSR = new Set(srToAdd);
        await this._updateActiveCombatWithSR(this._activeInSR);
      });
    });

    // Toggle individual SR buttons
    this.element.querySelectorAll<HTMLElement>("[data-toggle-sr]").forEach((el) => {
      const sr = Number(getRequiredDomDataset(el, "toggle-sr"));
      el.addEventListener("click", async () => {
        if (this._activeInSR.has(sr)) {
          this._activeInSR.delete(sr);
        } else {
          this._activeInSR.add(sr);
        }
        await this._updateActiveCombatWithSR(this._activeInSR);
      });
    });

    // Handle in-grid editing of runes
    this.element.querySelectorAll<HTMLElement>("[data-rune-grid-edit]").forEach((el) => {
      el.addEventListener("change", async (event) => {
        const updateId = getRequiredDomDataset(el, "item-id");
        const newChance = parseInt((event.target as HTMLInputElement).value);
        await this.actor.updateEmbeddedDocuments("Item", [
          { _id: updateId, system: { chance: newChance } },
        ]);
      });
    });

    // Handle in-grid editing of passions
    this.element.querySelectorAll<HTMLElement>("[data-passion-grid-edit]").forEach((el) => {
      el.addEventListener("change", async (event) => {
        const updateId = getRequiredDomDataset(el, "item-id");
        const newChance = parseInt((event.target as HTMLInputElement).value);
        await this.actor.updateEmbeddedDocuments("Item", [
          { _id: updateId, system: { chance: newChance } },
        ]);
      });
    });

    // Sort Items alphabetically
    this.element.querySelectorAll<HTMLElement>("[data-sort-items]").forEach((el) => {
      const itemType = getRequiredDomDataset(el, "sort-items");
      el.addEventListener("click", () => RqgActorSheetV2.sortItems(this.actor, itemType));
    });

    // Cycle the equipped state of a physical item
    this.element.querySelectorAll<HTMLElement>("[data-item-equipped-toggle]").forEach((el) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      el.addEventListener("click", async () => {
        if (itemId.startsWith("virtual:")) {
          const [, itemEquippedStatus, itemName] = itemId.split(":");
          const newEquippedStatus =
            equippedStatuses[
              (equippedStatuses.indexOf(itemEquippedStatus as EquippedStatus) + 1) %
                equippedStatuses.length
            ];
          const affectedItems = new ItemTree(
            this.actor.items.contents,
          ).getOtherItemIdsInSameLocationTree(itemName ?? "");
          const updates = affectedItems.map((id) => ({
            _id: id,
            system: { equippedStatus: newEquippedStatus },
          }));
          await this.actor.updateEmbeddedDocuments("Item", updates);
          return;
        }

        const item = this.actor.items.get(itemId) as RqgItem | undefined;
        assertDocumentSubType<PhysicalItem>(
          item,
          physicalItemTypes,
          `Couldn't find itemId [${itemId}] to toggle the equipped state (when clicked).`,
        );

        const newStatus =
          equippedStatuses[
            (equippedStatuses.indexOf(item.system.equippedStatus as EquippedStatus) + 1) %
              equippedStatuses.length
          ];
        await item.update({ system: { equippedStatus: newStatus } });
      });
    });

    // Add Passion button
    this.element.querySelectorAll<HTMLElement>("[data-passion-add]").forEach((el) => {
      el.addEventListener("click", async () => {
        const defaultItemIconSettings: any = game.settings?.get(
          systemId,
          "defaultItemIconSettings",
        );
        const newPassionName = localize("RQG.Item.Passion.PassionEnum.Loyalty");
        const passion = {
          name: newPassionName,
          type: ItemTypeEnum.Passion,
          img: defaultItemIconSettings[ItemTypeEnum.Passion],
          system: { passion: newPassionName },
        };
        const createdItems = await this.actor.createEmbeddedDocuments("Item", [passion]);
        (createdItems[0] as RqgItem)?.sheet?.render(true);
      });
    });

    // Add Gear buttons
    this.element.querySelectorAll<HTMLElement>("[data-gear-add]").forEach((el) => {
      const physicalItemType = getRequiredDomDataset(el, "gear-add");
      el.addEventListener("click", async () => {
        const defaultItemIconSettings: any = game.settings?.get(
          systemId,
          "defaultItemIconSettings",
        );

        const physicalItemType2ItemName = new Map<string, string>([
          ["unique", "RQG.Actor.Gear.NewGear"],
          ["currency", "RQG.Actor.Gear.NewCurrency"],
          ["consumable", "RQG.Actor.Gear.NewConsumable"],
        ]);

        const name = localize(
          physicalItemType2ItemName.get(physicalItemType) ?? "RQG.Actor.Gear.NewGear",
        );

        const newGear = {
          name: name,
          type: ItemTypeEnum.Gear,
          img: defaultItemIconSettings[ItemTypeEnum.Gear],
          system: { physicalItemType: physicalItemType },
        };
        const createdItems = await this.actor.createEmbeddedDocuments("Item", [newGear]);
        (createdItems[0] as RqgItem)?.sheet?.render(true);
      });
    });

    // Reputation roll — single click opens dialog, double click rolls immediately
    this.element.querySelectorAll<HTMLElement>("[data-reputation-roll]").forEach((el) => {
      let clickCount = 0;
      el.addEventListener("click", async (ev: MouseEvent) => {
        clickCount = Math.max(clickCount, ev.detail);
        if (clickCount >= 2) {
          await this.actor.reputationRollImmediate();
          clickCount = 0;
        } else if (clickCount === 1) {
          setTimeout(async () => {
            if (clickCount === 1) {
              await this.actor.reputationRoll();
            }
            clickCount = 0;
          }, 250);
        }
      });
    });

    // Set rich HTML tooltips on item icons (description + GM notes)
    const isGM = context.isGM;
    this.element.querySelectorAll<HTMLElement>("[data-item-tooltip]").forEach((el) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = this.actor.items.get(itemId) as RqgItem | undefined;
      if (!item) {
        return;
      }
      const itemSystem = item.system as {
        enrichedDescription?: string;
        enrichedGmNotes?: string;
      };
      const parts: string[] = [];
      if (itemSystem.enrichedDescription) {
        parts.push(itemSystem.enrichedDescription);
      }
      if (isGM && itemSystem.enrichedGmNotes) {
        parts.push(
          `<hr><div style="text-align:center"><strong>${localize("RQG.Item.SheetTab.GMNotes")}</strong></div>${itemSystem.enrichedGmNotes}`,
        );
      }
      if (parts.length) {
        el.dataset["tooltip"] = `<div class="item-description-tooltip">${parts.join("")}</div>`;
      }

      // Open item sheet on the description-like tab when the icon is clicked.
      el.addEventListener("click", () => {
        const tooltipTabMap: Partial<Record<ItemTypeEnum, string>> = {
          [ItemTypeEnum.Passion]: "backstory",
          [ItemTypeEnum.Gear]: "description",
          [ItemTypeEnum.Armor]: "description",
          [ItemTypeEnum.Weapon]: "description",
        };
        const sheet = item.sheet as any;
        const tab = tooltipTabMap[item.type as ItemTypeEnum];
        if (tab) {
          sheet.tabGroups = { ...(sheet.tabGroups ?? {}), sheet: tab };
        }
        sheet?.render(true);
      });
    });

    // Roll Item (Skill, Rune, Passion)
    this.element.querySelectorAll<HTMLElement>("[data-item-roll]").forEach((el) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = this.actor.items.get(itemId) as RqgItem | undefined;
      assertDocumentSubType<AbilityItem>(
        item,
        abilityItemTypes,
        "AbilityChance roll couldn't find skillItem",
      );
      let clickCount = 0;
      el.addEventListener("click", async (ev: MouseEvent) => {
        clickCount = Math.max(clickCount, ev.detail);
        if (clickCount >= 2) {
          await item.abilityRollImmediate();
          clickCount = 0;
        } else if (clickCount === 1) {
          setTimeout(async () => {
            if (clickCount === 1) {
              await item.abilityRoll();
            }
            clickCount = 0;
          }, CONFIG.RQG.dblClickTimeout);
        }
      });
    });

    // Skills filter
    this.element.querySelectorAll<HTMLInputElement>(".skill-filter").forEach((input) => {
      const applyFilter = (query: string) => {
        const masonry = input.closest(".skills-tab-v2")?.querySelector(".masonry");
        masonry?.querySelectorAll<HTMLElement>(".masonry-item").forEach((category) => {
          let anyVisible = false;
          category.querySelectorAll<HTMLElement>(".skill-row").forEach((row) => {
            const nameEl = row.querySelector<HTMLElement>("[data-item-roll]");
            const text = nameEl?.textContent?.toLowerCase() ?? "";
            const visible = !query || text.includes(query);
            row.style.display = visible ? "" : "contents"; // keep display:contents for visible rows
            // Use a data flag instead — hide all cells when filtered out
            row.querySelectorAll<HTMLElement>(":scope > *").forEach((cell) => {
              cell.style.display = visible ? "" : "none";
            });
            if (visible) {
              anyVisible = true;
            }
          });
          (category as HTMLElement).style.display = anyVisible ? "" : "none";
        });
      };

      // Restore filter from previous render
      if (this.#skillFilterQuery) {
        input.value = this.#skillFilterQuery;
        applyFilter(this.#skillFilterQuery);
      }

      input.addEventListener("input", () => {
        const query = input.value.trim().toLowerCase();
        this.#skillFilterQuery = query;
        applyFilter(query);
      });
    });

    // Roll Spirit Magic
    this.element.querySelectorAll<HTMLElement>("[data-spirit-magic-roll]").forEach((el) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = this.actor.items.get(itemId) as SpiritMagicItem | undefined;
      assertDocumentSubType<SpiritMagicItem>(
        item,
        ItemTypeEnum.SpiritMagic,
        `Couldn't find item [${itemId}] to roll Spirit Magic`,
      );
      let clickCount = 0;
      el.addEventListener("click", async (ev: MouseEvent) => {
        clickCount = Math.max(clickCount, ev.detail);
        if (clickCount >= 2) {
          if (item.system.isVariable && item.system.points > 1) {
            await item.spiritMagicRoll();
          } else {
            await item.spiritMagicRollImmediate();
          }
          clickCount = 0;
        } else if (clickCount === 1) {
          setTimeout(async () => {
            if (clickCount === 1) {
              await item.spiritMagicRoll();
            }
            clickCount = 0;
          }, CONFIG.RQG.dblClickTimeout);
        }
      });
    });

    // Roll Rune Magic
    this.element.querySelectorAll<HTMLElement>("[data-rune-magic-roll]").forEach((el) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = this.actor.items.get(itemId) as RuneMagicItem | undefined;
      assertDocumentSubType<RuneMagicItem>(
        item,
        ItemTypeEnum.RuneMagic,
        `Couldn't find item [${itemId}] to roll Rune Magic`,
      );
      let clickCount = 0;
      el.addEventListener("click", async (ev: MouseEvent) => {
        clickCount = Math.max(clickCount, ev.detail);
        if (clickCount >= 2) {
          if (item.system.points === 1) {
            await item.runeMagicRollImmediate();
          } else {
            await item.runeMagicRoll();
          }
          clickCount = 0;
        } else if (clickCount === 1) {
          setTimeout(async () => {
            if (clickCount === 1) {
              await item.runeMagicRoll();
            }
            clickCount = 0;
          }, CONFIG.RQG.dblClickTimeout);
        }
      });
    });

    // Roll Weapon (initiate combat/attack)
    this.element.querySelectorAll<HTMLElement>("[data-weapon-roll]").forEach((el) => {
      const weaponItemId = getRequiredDomDataset(el, "weapon-item-id");
      const weapon = this.actor.items.get(weaponItemId) as RqgItem | undefined;
      assertDocumentSubType<WeaponItem>(weapon, ItemTypeEnum.Weapon);
      let clickCount = 0;
      el.addEventListener("click", async (ev: MouseEvent) => {
        if ((ev.target as HTMLElement)?.tagName === "SELECT") {
          return;
        }
        clickCount = Math.max(clickCount, ev.detail);
        if (clickCount >= 2) {
          await weapon.attack();
          clickCount = 0;
        } else if (clickCount === 1) {
          setTimeout(async () => {
            if (clickCount === 1) {
              void weapon.attack();
            }
            clickCount = 0;
          }, CONFIG.RQG.dblClickTimeout);
        }
      });
    });

    // Edit item value (projectile select, quantity inputs)
    this.element.querySelectorAll<HTMLInputElement>("[data-item-edit-value]").forEach((el) => {
      const path = getRequiredDomDataset(el, "item-edit-value");
      const itemId = getRequiredDomDataset(el, "item-id");
      el.addEventListener("change", async (event) => {
        const item = this.actor.items.get(itemId) as RqgItem | undefined;
        requireValue(item, `Couldn't find itemId [${itemId}] to edit an item (when clicked).`);
        await item.update({ [path]: (event.target as HTMLInputElement)?.value }, {});
      });
    });

    // Add wound to hit location
    this.element.querySelectorAll<HTMLElement>("[data-item-add-wound]").forEach((el) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      el.addEventListener("click", () => HitLocationSheet.showAddWoundDialog(this.actor, itemId));
    });

    // Heal wounds on hit location
    this.element.querySelectorAll<HTMLElement>("[data-item-heal-wound]").forEach((el) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      el.addEventListener("click", () => HitLocationSheet.showHealWoundDialog(this.actor, itemId));
    });

    // Roll Damage
    this.element.querySelectorAll<HTMLElement>("[data-damage-roll]").forEach((el) => {
      const damage = el.dataset["damageRoll"];
      requireValue(damage, "direct damage roll without damage");
      const { damageFormula, damageBonusPlaceholder } =
        getNormalizedDamageFormulaAndDamageBonus(damage);

      let damageFormulaWithDb = damage;
      if (damageBonusPlaceholder) {
        const formattedDamage = formatDamagePart(damageFormula, "RQG.Roll.DamageRoll.WeaponDamage");
        damageFormulaWithDb = applyDamageBonusToFormula(
          formattedDamage + damageBonusPlaceholder,
          this.actor.system.attributes.damageBonus,
        );
      }

      const heading = el.dataset["damageRollHeading"] ?? "";
      el.addEventListener("click", async () => {
        const r = new DamageRoll(damageFormulaWithDb);
        await r.evaluate();
        await r.toMessage({
          speaker: ChatMessage.getSpeaker(),
          flavor: `<div class="roll-action">${localize(heading)}</div>`,
        });
      });
    });

    // Flip hit location sort order
    this.element
      .querySelectorAll<HTMLElement>("[data-flip-sort-hitlocation-setting]")
      .forEach((el) => {
        el.addEventListener("click", async () => {
          const currentValue = game.settings?.get(systemId, "sortHitLocationsLowToHigh");
          await game.settings?.set(systemId, "sortHitLocationsLowToHigh", !currentValue);
          this.render();
        });
      });
  }

  /**
   * Sync combatants to match the desired set of active SRs.
   * Reuses existing combatants by updating their initiative to minimise
   * document operations (and therefore re-renders).
   */
  private async _updateActiveCombatWithSR(activeInSR: Set<number>): Promise<void> {
    const combat = game.combat;
    if (!combat) {
      throw new RqgError(
        "Programming error: _updateActiveCombatWithSR should not be run if there are no combats.",
      );
    }

    const currentCombatants = combat.getCombatantsByActor(this.actor);
    if (currentCombatants.length === 0) {
      return;
    }

    const desiredSRs = [...activeInSR];

    // No SRs selected — keep one combatant with null initiative, delete the rest
    if (desiredSRs.length === 0) {
      const extras = currentCombatants
        .slice(1)
        .map((c) => c.id)
        .filter(isTruthy);
      if (extras.length > 0) {
        await combat.deleteEmbeddedDocuments("Combatant", extras);
      }
      await currentCombatants[0]?.update({ initiative: null });
      return;
    }

    // Find combatants that already have a matching SR — no change needed
    const keepAsIs = new Set<string>();
    const needAssignment: number[] = [];
    for (const sr of desiredSRs) {
      const match = currentCombatants.find(
        (c) => c.initiative === sr && c.id != null && !keepAsIs.has(c.id),
      );
      if (match) {
        keepAsIs.add(match.id!);
      } else {
        needAssignment.push(sr);
      }
    }

    // Combatants not kept can be reassigned to a new SR or deleted
    const reusable = currentCombatants.filter((c) => c.id != null && !keepAsIs.has(c.id!));

    // Reassign as many reusable combatants as possible
    const updates: { _id: string; initiative: number }[] = [];
    for (let i = 0; i < Math.min(needAssignment.length, reusable.length); i++) {
      updates.push({ _id: reusable[i]!.id!, initiative: needAssignment[i]! });
    }

    // Delete leftover reusable combatants
    const idsToDelete = reusable
      .slice(needAssignment.length)
      .map((c) => c.id)
      .filter(isTruthy);

    // Create combatants for any SRs that couldn't be covered by reuse
    const template = currentCombatants[0]!;
    const toCreate = needAssignment.slice(reusable.length).map((sr) => ({
      actorId: template.actorId,
      tokenId: template.tokenId,
      sceneId: template.sceneId,
      initiative: sr,
    }));

    // Execute — typically only 1 of these 3 branches fires
    if (idsToDelete.length > 0) {
      await combat.deleteEmbeddedDocuments("Combatant", idsToDelete);
    }
    if (updates.length > 0) {
      await combat.updateEmbeddedDocuments("Combatant", updates);
    }
    if (toCreate.length > 0) {
      await combat.createEmbeddedDocuments("Combatant", toCreate);
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

  private static async sortItems(actor: CharacterActor, itemType: string): Promise<void> {
    const itemsToSort = actor.items.filter((i) => i.type === itemType) as RqgItem[];
    itemsToSort.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
    itemsToSort.forEach((item, index) => {
      item.sort =
        index === 0
          ? CONST.SORT_INTEGER_DENSITY
          : (itemsToSort[index - 1]?.sort ?? 0) + CONST.SORT_INTEGER_DENSITY;
    });
    const updateData = itemsToSort.map((item) => ({ _id: item.id, sort: item.sort }));
    await actor.updateEmbeddedDocuments("Item", updateData);
  }

  private async _onDropRqidDocument(event: DragEvent): Promise<boolean> {
    event.preventDefault();
    event.stopPropagation();

    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event) as {
      type?: string;
      uuid?: string;
    } | null;
    const allowedDropDocumentNames = getAllowedDropDocumentNames(event);
    if (!isAllowedDocumentNames(data?.type, allowedDropDocumentNames)) {
      return false;
    }

    switch (data?.type) {
      case "Item":
      case "JournalEntry":
      case "JournalEntryPage": {
        if (!data.uuid) {
          return false;
        }
        const {
          droppedDocument,
          dropZoneData: targetPropertyName,
          isAllowedToDrop,
          allowDuplicates,
        } = await extractDropInfo<foundry.abstract.Document.Any>(event, {
          type: data.type,
          uuid: data.uuid,
        } as any);

        if (!isAllowedToDrop || !hasRqid(droppedDocument)) {
          return false;
        }

        await updateRqidLink(
          this.actor as foundry.abstract.Document.Any,
          targetPropertyName,
          droppedDocument,
          allowDuplicates,
        );
        return true;
      }
      default:
        isAllowedDocumentNames(data?.type, ["Item", "JournalEntry", "JournalEntryPage"]);
        return false;
    }
  }
}
