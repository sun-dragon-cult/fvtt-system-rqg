import type { RqgSheetHeaderControl, RqgActorSheetV2Context } from "./rqg-actor-sheet-v2.types";
import type { DeepPartial } from "fvtt-types/utils";
import { ActorTypeEnum, type CharacterActor } from "../data-model/actor-data/rqg-actor-data";
import { CharacterDataModel } from "../data-model/actor-data/character-data-model";
import { actorHealthStatuses } from "../data-model/actor-data/attributes";
import { RQG_CONFIG, systemId } from "../system/config";
import {
  assertDocumentSubType,
  getEventTargetElement,
  getRequiredDomDataset,
  hasOwnProperty,
  isDocumentSubType,
  isFoundryElementInstanceOf,
  isTruthy,
  localize,
  range,
  requireValue,
  RqgError,
} from "../system/util";

import type { RqgItem } from "../items/rqg-item";
import type { RqgActor } from "./rqg-actor";
import type { AbilityItem, PhysicalItem } from "@item-model/item-types.ts";
import type { ArmorItem } from "@item-model/armor-data-model.ts";
import type { OccupationItem } from "@item-model/occupation-data-model.ts";
import { abilityItemTypes, ItemTypeEnum } from "@item-model/item-types.ts";
import type { WeaponItem } from "@item-model/weapon-data-model.ts";
import {
  showHitLocationAddWoundDialog,
  showHitLocationHealWoundDialog,
} from "../items/hit-location-item";
import {
  applyDamageBonusToFormula,
  formatDamagePart,
  getNormalizedDamageFormulaAndDamageBonus,
} from "../system/combat-calculations";
import { DamageRoll } from "../rolls/damage-roll/damage-roll";
import { templatePaths } from "../system/load-handlebars-templates";
import * as DataPrep from "./rqg-actor-sheet-data-prep";
import { RqidLink } from "../data-model/shared/rqid-link";
import { decorateRqidFrameButton, getRqidFrameButton } from "../documents/rqid-sheet-button";
import { RqgContextMenu } from "../foundry-ui/rqg-context-menu";
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
  updateRqidLink,
} from "../documents/drag-drop";
import type { SpiritMagicItem } from "@item-model/spirit-magic-data-model.ts";
import type { RuneMagicItem } from "@item-model/rune-magic-data-model.ts";
import type { GearItem } from "@item-model/gear-data-model.ts";
import type { RqgActiveEffect } from "../active-effect/rqg-active-effect.ts";
import { ActorWizard } from "../applications/actor-wizard-application";
import { actorWizardFlags } from "../data-model/shared/rqg-document-flags";
import {
  equippedStatuses,
  type EquippedStatus,
  type PhysicalItemType,
  physicalItemTypes,
} from "../data-model/item-data/i-physical-item";
import { ItemTree } from "../items/shared/item-tree";
import { confirmActorItemDelete } from "./confirm-item-delete-dialog";
import { getSpeakerCompat } from "../system/fvtt-type-compat";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const ActorSheetV2 = foundry.applications.sheets.ActorSheetV2;

/** Click behavior options used by single/double click bindings. */
type SingleDoubleClickOptions = {
  onSingle: () => Promise<void> | void;
  onDouble?: () => Promise<void> | void;
  shouldHandleEvent?: (ev: MouseEvent) => boolean;
  timeout?: number;
};

type PhysicalTransferResult =
  | { kind: "created"; item: RqgItem }
  | { kind: "merged" }
  | { kind: "failed" }
  | { kind: "cancelled" };

export class RqgActorSheetV2 extends HandlebarsApplicationMixin(ActorSheetV2) {
  #skillFilterQuery = "";

  private _rqgDragDrop?: foundry.applications.ux.DragDrop.Any;

  override get actor(): CharacterActor {
    return this.document as CharacterActor;
  }

  // Runtime override of ActorSheetV2 _dragDrop; current fvtt-types do not expose this member.
  protected get _dragDrop(): foundry.applications.ux.DragDrop.Any {
    this._rqgDragDrop ??= new foundry.applications.ux.DragDrop.implementation({
      dragSelector: "[data-item-drag-handle][data-item-id]",
      // Include a non-root content drop target for generic Foundry handling.
      // Do not include the root selector here: if html.matches(dropSelector),
      // Foundry binds only the root and skips descendant dropzones.
      dropSelector: ".sheet-content, .contextmenu.item[data-item-id], [data-dropzone]",
      permissions: {
        dragstart: (selector) => this._canDragStart(selector ?? ""),
        drop: (selector) => this._canDragDrop(selector ?? ""),
      },
      callbacks: {
        dragstart: this._onDragStart.bind(this),
        dragover: this._onDragOver.bind(this),
        drop: this._onDrop.bind(this),
        dragleave: this._onDragLeave.bind(this),
        dragend: this._onDragEnd.bind(this),
      },
    });
    return this._rqgDragDrop;
  }

  static override DEFAULT_OPTIONS = {
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
    actions: {
      editItem: RqgActorSheetV2._openItemSheetAction,
      deleteItem: RqgActorSheetV2._deleteItemAction,
      sortItems: RqgActorSheetV2._sortItemsAction,
      addWound: RqgActorSheetV2._addWoundAction,
      healWound: RqgActorSheetV2._healWoundAction,
      flipHitLocationSortSetting: RqgActorSheetV2._flipHitLocationSortSettingAction,
      deleteActiveEffect: RqgActorSheetV2._deleteActiveEffectAction,
      editActiveEffect: RqgActorSheetV2._editActiveEffectAction,
      setSR: RqgActorSheetV2._setSRAction,
      toggleSR: RqgActorSheetV2._toggleSRAction,
      addPassion: RqgActorSheetV2._addPassionAction,
      addGear: RqgActorSheetV2._addGearAction,
    },
  } satisfies foundry.applications.api.ApplicationV2.DefaultOptions;

  static override PARTS: Record<
    string,
    foundry.applications.api.HandlebarsApplicationMixin.HandlebarsTemplatePart
  > = {
    nav: { template: templatePaths.actorSheetV2Nav, scrollable: [""] },
    content: { template: templatePaths.actorSheetV2Content, scrollable: [""] },
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

  override _getHeaderControls(): RqgSheetHeaderControl[] {
    const controls = super._getHeaderControls() as RqgSheetHeaderControl[];
    const user = game.user;
    if (user?.isGM || user?.isTrusted) {
      const isEditMode = this.actor.system.editMode;
      controls.unshift({
        icon: isEditMode ? "play-mode-icon" : "edit-mode-icon",
        label: isEditMode
          ? localize("RQG.Actor.EditMode.SwitchToPlayMode")
          : localize("RQG.Actor.EditMode.SwitchToEditMode"),
        action: "toggleEditMode",
        onClick: () => {
          this.actor.update({ system: { editMode: !this.actor.system.editMode } });
        },
      });
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
          new ActorWizard(this.actor, {}).render({ force: true });
        },
      });
    }
    return controls;
  }

  // @ts-expect-error TEMP(v14-types) _getFrameButtons exists at runtime in Foundry >=14.361
  override _getFrameButtons(
    options: unknown,
  ): foundry.applications.api.ApplicationV2.HeaderControlsEntry[] {
    // @ts-expect-error TEMP(v14-types) super._getFrameButtons is missing from current type defs
    const buttons = super._getFrameButtons(
      options,
    ) as foundry.applications.api.ApplicationV2.HeaderControlsEntry[];
    buttons.unshift(getRqidFrameButton(this as unknown as DocumentSheet<any, any>));
    return buttons;
  }

  // @ts-expect-error Return type is intentionally narrowed from the fvtt-types RenderContext
  override async _prepareContext(): Promise<RqgActorSheetV2Context> {
    assertDocumentSubType<CharacterActor>(this.actor, ActorTypeEnum.Character);
    // Spread the DataModel into a plain object to capture live (prepared) data.
    // duplicate() on a DataModel only returns _source data, missing prepare-phase derived values.
    const system = { ...this.actor.system } as CharacterActor["system"];
    const spiritMagicPointSum = CharacterDataModel.getSpiritMagicPointSum(this.actor);
    const incorrectRunes: RqgItem[] = [];
    const embeddedItems = await DataPrep.organizeEmbeddedItems(this.actor, incorrectRunes);
    const itemTree = new ItemTree(this.actor.items.contents);
    const uniqueGearItems = ((embeddedItems[ItemTypeEnum.Gear] ?? []) as GearItem[])
      .filter((item) => foundry.utils.getProperty(item, "system.physicalItemType") === "unique")
      .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
    const consumableGearItems = ((embeddedItems[ItemTypeEnum.Gear] ?? []) as GearItem[])
      .filter((item) => foundry.utils.getProperty(item, "system.physicalItemType") === "consumable")
      .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
    const currencyItems = (embeddedItems["currency"] ?? []) as GearItem[];
    const weaponItems = ((embeddedItems[ItemTypeEnum.Weapon] ?? []) as WeaponItem[])
      .filter((item) => !foundry.utils.getProperty(item, "system.isNatural"))
      .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
    const armorItems = (embeddedItems[ItemTypeEnum.Armor] ?? []).sort(
      (a: RqgItem, b: RqgItem) => (a.sort ?? 0) - (b.sort ?? 0),
    ) as RqgItem[];
    const dexStrikeRank = system.attributes.dexStrikeRank;
    const formRuneGroups = DataPrep.getRuneOpposedPairs(embeddedItems?.rune?.form ?? {});
    const showUiSection = DataPrep.getUiSectionVisibility(this.actor);
    const cultItems = (embeddedItems[ItemTypeEnum.Cult] ?? []) as RqgItem[];
    const availableCultTabs = cultItems.map((cult) => `cult-${cult.id}`);
    const requestedCultTab = this.tabGroups["cult-view"] ?? undefined;
    const activeCultTab =
      requestedCultTab && availableCultTabs.includes(requestedCultTab)
        ? requestedCultTab
        : availableCultTabs[0];

    // Compute active SRs from combat tracker
    const actorCombatants: Combatant[] | undefined = game.combat?.getCombatantsByActor(
      this.actor.id ?? "",
    );
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
      activeTabs: {
        primary: this.tabGroups["primary"] ?? "combat",
        gearView: this.tabGroups["gear-view"] ?? "by-item-type",
        cultView: activeCultTab,
      },
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
      freeInt: CharacterDataModel.getFreeInt(this.actor, spiritMagicPointSum),
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
      showUiSection,
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

  /** Tracks which SRs are active in combat for this actor */
  private _activeInSR: Set<number> = new Set<number>();

  /** Temporary image element used as drag preview */
  private _activeDragPreview: HTMLImageElement | null = null;

  /** Currently highlighted focused dropzone under the drag cursor. */
  private _activeDropzone: HTMLElement | null = null;

  /** True when the active drag originates from this actor's own items (reorder only, no sheet glow). */
  private _isSameActorDrag = false;

  private _bindSingleDoubleClick(
    el: HTMLElement,
    { onSingle, onDouble, shouldHandleEvent, timeout }: SingleDoubleClickOptions,
  ): void {
    let clickCount = 0;
    const resolvedTimeout = timeout ?? CONFIG.RQG.dblClickTimeout;
    const doubleHandler = onDouble ?? onSingle;

    el.addEventListener("click", async (ev: MouseEvent) => {
      if (shouldHandleEvent && !shouldHandleEvent(ev)) {
        return;
      }

      clickCount = Math.max(clickCount, ev.detail);

      if (clickCount >= 2) {
        await doubleHandler();
        clickCount = 0;
      } else if (clickCount === 1) {
        setTimeout(async () => {
          if (clickCount === 1) {
            await onSingle();
          }
          clickCount = 0;
        }, resolvedTimeout);
      }
    });
  }

  override async _onRender(
    context: foundry.applications.api.HandlebarsApplicationMixin.RenderContext,
    options: DeepPartial<foundry.applications.api.ApplicationV2.RenderOptions>,
  ): Promise<void> {
    await super._onRender(context, options);

    // Toggle edit-mode class for styling
    const isEditMode = !!this.actor.system.editMode;
    this.element.classList.toggle("edit-mode", isEditMode);

    // Toggle health state class (wounded, shock, unconscious, dead)
    const health = this.actor.system.attributes.health;
    for (const state of actorHealthStatuses) {
      this.element.classList.toggle(state, health === state);
    }

    // RQID header button (AppV2 _getFrameButtons version)
    await decorateRqidFrameButton(this as unknown as DocumentSheet<any, any>);

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

    // Context menus bind to this.element — create once to avoid accumulating listeners.
    if (options.isFirstRender) {
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
        runeMenuOptions(this.actor, this.document.token),
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
        skillMenuOptions(this.actor, this.document.token),
        ctxMenuOptions,
      );
      new RqgContextMenu(
        this.element,
        ".passion.contextmenu",
        passionMenuOptions(this.actor, this.document.token),
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
    }

    // RQID link open/delete handlers (bind once; delegated handlers survive re-renders)
    if (options.isFirstRender) {
      RqidLink.bindHandlers(this.element, this.actor as foundry.abstract.Document.Any);
    }

    // --- Combat tab event handlers ---

    // Roll actor Characteristic
    this.element.querySelectorAll<HTMLElement>("[data-characteristic-roll]").forEach((el) => {
      const closestDataCharacteristic = el.closest<HTMLElement>("[data-characteristic]");
      const characteristicName = closestDataCharacteristic?.dataset["characteristic"];
      const actorCharacteristics = this.actor.system.characteristics as Record<string, unknown>;

      if (!characteristicName || !(characteristicName in actorCharacteristics)) {
        const msg = `Characteristic [${characteristicName}] isn't found on actor [${this.actor.name}].`;
        ui.notifications?.error(msg);
        throw new RqgError(msg, this.actor);
      }

      const typedCharacteristicName =
        characteristicName as keyof CharacterActor["system"]["characteristics"];

      this._bindSingleDoubleClick(el, {
        onSingle: () => this.actor.characteristicRoll(typedCharacteristicName, this.document.token),
        onDouble: () =>
          this.actor.characteristicRollImmediate(typedCharacteristicName, this.document.token),
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

    // Cycle the equipped state of a physical item
    this.element.querySelectorAll<HTMLElement>("[data-item-equipped-toggle]").forEach((el) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      el.addEventListener("click", async (event) => {
        event.stopPropagation();
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
            (equippedStatuses.indexOf(item.system.equippedStatus) + 1) % equippedStatuses.length
          ];

        // Update the item and all items in the same location tree (e.g., container contents)
        const affectedItems = new ItemTree(
          this.actor.items.contents,
        ).getOtherItemIdsInSameLocationTree(item.name ?? "");
        const updates = [
          { _id: itemId, system: { equippedStatus: newStatus } },
          ...affectedItems.map((id) => ({
            _id: id,
            system: { equippedStatus: newStatus },
          })),
        ];

        await this.actor.updateEmbeddedDocuments("Item", updates);
      });
    });

    // Reputation roll — single click opens dialog, double click rolls immediately
    this.element.querySelectorAll<HTMLElement>("[data-reputation-roll]").forEach((el) => {
      this._bindSingleDoubleClick(el, {
        onSingle: () => this.actor.reputationRoll(this.document.token),
        onDouble: () => this.actor.reputationRollImmediate(this.document.token),
      });
    });

    // Set rich HTML tooltips on item icons (description + GM notes)
    const isGM = game.user?.isGM ?? false;
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
        sheet?.render({ force: true });
      });
    });

    // Roll Item (Skill, Rune, Passion)
    this.element.querySelectorAll<HTMLElement>("[data-item-roll]").forEach((el) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = this.actor.items.get(itemId) as RqgItem | undefined;
      const weaponEffectModifier = Number(el.dataset["weaponEffectModifier"] ?? 0);
      const weaponEffectModifiers = weaponEffectModifier
        ? [
            {
              value: weaponEffectModifier,
              description: localize("RQG.Roll.AbilityRoll.WeaponEffect"),
            },
          ]
        : [];
      assertDocumentSubType<AbilityItem>(
        item,
        abilityItemTypes,
        "AbilityChance roll couldn't find skillItem",
      );
      this._bindSingleDoubleClick(el, {
        onSingle: () => item.abilityRoll(this.document.token, { modifiers: weaponEffectModifiers }),
        onDouble: () =>
          item.abilityRollImmediate({ modifiers: weaponEffectModifiers }, this.document.token),
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
      this._bindSingleDoubleClick(el, {
        onSingle: () => item.spiritMagicRoll(this.document.token),
        onDouble: () => {
          if (item.system.isVariable && item.system.points > 1) {
            return item.spiritMagicRoll(this.document.token);
          } else {
            return item.spiritMagicRollImmediate(undefined, this.document.token);
          }
        },
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
      this._bindSingleDoubleClick(el, {
        onSingle: () => item.runeMagicRoll(this.document.token),
        onDouble: () => {
          if (item.system.points === 1) {
            return item.runeMagicRollImmediate({}, this.document.token);
          } else {
            return item.runeMagicRoll(this.document.token);
          }
        },
      });
    });

    // Roll Weapon (initiate combat/attack)
    this.element.querySelectorAll<HTMLElement>("[data-weapon-roll]").forEach((el) => {
      const weaponItemId = getRequiredDomDataset(el, "weapon-item-id");
      const weapon = this.actor.items.get(weaponItemId) as RqgItem | undefined;
      assertDocumentSubType<WeaponItem>(weapon, ItemTypeEnum.Weapon);
      this._bindSingleDoubleClick(el, {
        shouldHandleEvent: (ev) => (ev.target as HTMLElement)?.tagName !== "SELECT",
        onSingle: () => weapon.attack(),
        onDouble: () => weapon.attack(),
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
      el.addEventListener("click", (event) => {
        event.stopPropagation();
      });
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
          speaker: getSpeakerCompat({ actor: this.actor, token: this.actor.token ?? undefined }),
          flavor: `<div class="roll-action">${localize(heading)}</div>`,
        });
      });
    });
  }

  private static _openItemSheetAction(
    this: RqgActorSheetV2,
    _event: PointerEvent,
    target: HTMLElement,
  ): void {
    const itemId = target.closest<HTMLElement>("[data-item-id]")?.dataset["itemId"];
    requireValue(itemId, "No item id found to open item sheet");

    const item = this.actor.items.get(itemId) as RqgItem | undefined;
    if (!item?.sheet) {
      const msg = `Couldn't find itemId [${itemId}] on actor ${this.actor.name} to open item sheet.`;
      ui.notifications?.error(msg);
      throw new RqgError(msg);
    }
    // @ts-expect-error render signature varies between V1/V2 sheet implementations
    item.sheet.render({ force: true });
  }

  private static _deleteItemAction(
    this: RqgActorSheetV2,
    _event: PointerEvent,
    target: HTMLElement,
  ): void {
    const itemId = target.closest<HTMLElement>("[data-item-id]")?.dataset["itemId"];
    requireValue(itemId, "No item id found to delete item");
    void confirmActorItemDelete(this.actor, itemId);
  }

  private static _sortItemsAction(
    this: RqgActorSheetV2,
    _event: PointerEvent,
    target: HTMLElement,
  ): void {
    const itemType = target.dataset["sortItems"];
    requireValue(itemType, "No sort item type found");
    void RqgActorSheetV2.sortItems(this.actor, itemType);
  }

  private static _addWoundAction(
    this: RqgActorSheetV2,
    _event: PointerEvent,
    target: HTMLElement,
  ): void {
    const itemId = target.closest<HTMLElement>("[data-item-id]")?.dataset["itemId"];
    requireValue(itemId, "No hit location item id found to add wound");
    void showHitLocationAddWoundDialog(this.actor, itemId);
  }

  private static _healWoundAction(
    this: RqgActorSheetV2,
    _event: PointerEvent,
    target: HTMLElement,
  ): void {
    const itemId = target.closest<HTMLElement>("[data-item-id]")?.dataset["itemId"];
    requireValue(itemId, "No hit location item id found to heal wound");
    void showHitLocationHealWoundDialog(this.actor, itemId);
  }

  private static async _flipHitLocationSortSettingAction(
    this: RqgActorSheetV2,
    _event: PointerEvent,
    _target: HTMLElement,
  ): Promise<void> {
    const currentValue = game.settings?.get(systemId, "sortHitLocationsLowToHigh");
    await game.settings?.set(systemId, "sortHitLocationsLowToHigh", !currentValue);
    this.render({ force: true });
  }

  private static _editActiveEffectAction(
    this: RqgActorSheetV2,
    _event: PointerEvent,
    target: HTMLElement,
  ): void {
    const effectRow = target.closest<HTMLElement>("[data-effect-uuid]");
    const effectUuid = effectRow?.dataset["effectUuid"];
    requireValue(effectUuid, "No active effect uuid found to edit the effect");

    const effect = fromUuidSync(effectUuid) as RqgActiveEffect | undefined;
    requireValue(effect, `No active effect id [${effectUuid}] to edit the effect`);
    new foundry.applications.sheets.ActiveEffectConfig({ document: effect }).render({
      force: true,
    });
  }

  private static async _deleteActiveEffectAction(
    this: RqgActorSheetV2,
    event: PointerEvent,
    target: HTMLElement,
  ): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    await this._confirmDeleteActiveEffect(target);
  }

  private async _confirmDeleteActiveEffect(actionEl: HTMLElement): Promise<void> {
    const effectRow = actionEl.closest<HTMLElement>("[data-effect-uuid]");
    const effectUuid = effectRow?.dataset["effectUuid"];
    requireValue(effectUuid, "No active effect uuid found to delete the effect");

    const effect = fromUuidSync(effectUuid) as RqgActiveEffect | undefined;
    requireValue(effect, `No active effect id [${effectUuid}] to delete the effect`);

    const title = localize("RQG.Dialog.confirmActiveEffectDeleteDialog.title", {
      effectName: effect.name,
    });
    const content = localize("RQG.Dialog.confirmActiveEffectDeleteDialog.content", {
      effectName: effect.name,
    });

    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title },
      content,
      yes: {
        action: "confirm",
        label: localize("RQG.Dialog.Common.btnConfirm"),
        icon: "fas fa-check",
      },
      no: {
        action: "cancel",
        label: localize("RQG.Dialog.Common.btnCancel"),
        icon: "fas fa-times",
        default: true,
      },
    });

    if (confirmed) {
      await effect.delete();
    }
  }

  private static async _setSRAction(
    this: RqgActorSheetV2,
    _event: PointerEvent,
    target: HTMLElement,
  ): Promise<void> {
    const srValue = getRequiredDomDataset(target, "set-sr");
    const srToAdd = srValue.split(",").map((v) => Number(v.trim()));
    this._activeInSR = new Set(srToAdd);
    await this._updateActiveCombatWithSR(this._activeInSR);
  }

  private static async _toggleSRAction(
    this: RqgActorSheetV2,
    _event: PointerEvent,
    target: HTMLElement,
  ): Promise<void> {
    const sr = Number(getRequiredDomDataset(target, "toggle-sr"));
    if (this._activeInSR.has(sr)) {
      this._activeInSR.delete(sr);
    } else {
      this._activeInSR.add(sr);
    }
    await this._updateActiveCombatWithSR(this._activeInSR);
  }

  private static async _addPassionAction(
    this: RqgActorSheetV2,
    _event: PointerEvent,
    _target: HTMLElement,
  ): Promise<void> {
    const defaultItemIconSettings: any = game.settings?.get(systemId, "defaultItemIconSettings");
    const newPassionName = localize("RQG.Item.Passion.PassionEnum.Loyalty");
    const passion = {
      name: newPassionName,
      type: ItemTypeEnum.Passion,
      img: defaultItemIconSettings[ItemTypeEnum.Passion],
      system: { passion: newPassionName },
    };
    const createdItems = await this.actor.createEmbeddedDocuments("Item", [passion]);
    // @ts-expect-error render signature varies between V1/V2 sheet implementations
    (createdItems[0] as RqgItem)?.sheet?.render({ force: true });
  }

  private static async _addGearAction(
    this: RqgActorSheetV2,
    _event: PointerEvent,
    target: HTMLElement,
  ): Promise<void> {
    const physicalItemType = getRequiredDomDataset(target, "gear-add") as PhysicalItemType;
    const defaultItemIconSettings: any = game.settings?.get(systemId, "defaultItemIconSettings");

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
    // @ts-expect-error render signature varies between V1/V2 sheet implementations
    (createdItems[0] as RqgItem)?.sheet?.render({ force: true });
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

    const currentCombatants = combat.getCombatantsByActor(this.actor.id ?? "");
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

    const maxHitPoints = sheet.actor.system.attributes.hitPoints.max;

    if (
      data["system.attributes.hitPoints.value"] == null ||
      (data["system.attributes.hitPoints.value"] as number) >= (maxHitPoints ?? 0)
    ) {
      data["system.attributes.hitPoints.value"] = maxHitPoints;
    }

    await sheet.actor.update(data);
  }

  protected override async _onDragStart(event: DragEvent): Promise<void> {
    await super._onDragStart(event);

    const eventTarget = getEventTargetElement(event);
    const dragHandle = eventTarget?.closest("[data-item-drag-handle], [data-weapon-drag-handle]");
    if (!isFoundryElementInstanceOf(dragHandle, HTMLElement)) {
      return;
    }

    const itemContainer = dragHandle.closest("[data-item-id]");
    if (!isFoundryElementInstanceOf(itemContainer, HTMLElement)) {
      return;
    }

    const itemId = itemContainer.dataset["itemId"];
    const item = itemId ? this.actor.items.get(itemId) : undefined;
    // If no item or no image, keep the default grab SVG.
    if (!item?.img || !event.dataTransfer) {
      return;
    }

    // Suppress sheet-level glow for same-actor reorders; clear when the drag operation ends.
    this._isSameActorDrag = true;

    const iconElement = itemContainer.querySelector<HTMLImageElement>("img[data-item-id], img");
    const imgSrc = iconElement?.currentSrc || iconElement?.src || item.img;
    this._activeDragPreview = this._buildDragPreview(imgSrc);
    event.dataTransfer.setDragImage(this._activeDragPreview, 18, 18);
  }

  protected _onDragEnd(_event: DragEvent): void {
    this._resetDragVisualState();
  }

  /** Creates a small fixed-position image used as the drag ghost. */
  private _buildDragPreview(imgSrc: string): HTMLImageElement {
    this._activeDragPreview?.remove();
    const resolvedSrc = /^(https?:)?\/\//.test(imgSrc) ? imgSrc : foundry.utils.getRoute(imgSrc);
    const preview = document.createElement("img");
    preview.src = resolvedSrc;
    Object.assign(preview.style, {
      position: "fixed",
      top: "-1000px",
      left: "-1000px",
      width: "36px",
      height: "36px",
      objectFit: "contain",
      pointerEvents: "none",
    });
    document.body.append(preview);
    return preview;
  }

  /**
   * Fired when a drag leaves a drop target. Only used to clean up when the cursor
   * exits the sheet entirely — dropzone tracking while inside is handled by _onDragOver.
   */
  protected _onDragLeave(event: DragEvent): void {
    // Use .sheet-content bounds: the header and nav sidebar are inside this.element
    // but are not valid drop areas, so dragging into them should clear indicators.
    const dropArea = this.element.querySelector<HTMLElement>(".sheet-content") ?? this.element;
    const rect = dropArea.getBoundingClientRect();
    const leftSheet =
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom;

    if (leftSheet) {
      this._clearDropIndicators();
      this._clearDragState();
    }
  }

  /** Tracks the currently highlighted focused dropzone and controls the sheet-level glow. */
  private _setActiveDropzone(dropzone: HTMLElement | null): void {
    if (this._activeDropzone !== dropzone) {
      this._activeDropzone?.classList.remove("drag-hover");
      this._activeDropzone = dropzone;
      dropzone?.classList.add("drag-hover");
    }
    // Sheet-level glow is suppressed for same-actor reorders and when a focused dropzone is active.
    this.element.classList.toggle("drag-hover-sheet", !dropzone && !this._isSameActorDrag);
  }

  /** Clears all transient drag visual state and the active drag preview. */
  private _clearDragState(): void {
    this._setActiveDropzone(null);
    this.element.classList.remove("drag-hover-sheet");
    this._activeDragPreview?.remove();
    this._activeDragPreview = null;
  }

  /** Resets all drag transient state; safe to call from drop and dragend. */
  private _resetDragVisualState(): void {
    this._clearDropIndicators();
    this._isSameActorDrag = false;
    this._clearDragState();
  }

  protected override _onDragOver(event: DragEvent): void {
    super._onDragOver(event);

    const eventTarget = getEventTargetElement(event);
    const dropzone = eventTarget?.closest<HTMLElement>("[data-dropzone]") ?? null;
    this._setActiveDropzone(dropzone);

    const target =
      eventTarget?.closest<HTMLElement>(".location-row[data-item-id]") ??
      eventTarget?.closest<HTMLElement>(".contextmenu.item[data-item-id]");

    // Clear all existing indicators first
    this.element
      .querySelectorAll(".drop-before, .drop-after, .drop-into, .drop-into-container")
      .forEach((el) => {
        el.classList.remove("drop-before", "drop-after", "drop-into", "drop-into-container");
      });

    if (!target) {
      return;
    }
    const itemId = target.dataset["itemId"];
    if (!itemId) {
      return;
    }

    // Check if dropping on a skill/rune row (these can't be reordered within same actor)
    const skillRow = target.closest(".skill-row");
    const runeRow = target.closest(".rune-card, .rune");
    if (skillRow || runeRow) {
      // Same-actor drags cannot reorder these rows, but external/sidebar drops are allowed.
      event.dataTransfer!.dropEffect = this._isSameActorDrag ? "none" : "copy";
      return;
    }

    // Set cursor for reorderable items: "move" for same-actor rearrangement
    event.dataTransfer!.dropEffect = "move";

    const weaponRow = target.closest<HTMLElement>(
      `.weapon-row[data-item-id="${CSS.escape(itemId)}"]`,
    );
    const locationRow = target.closest<HTMLElement>(
      `.location-row[data-item-id="${CSS.escape(itemId)}"]`,
    );
    const rowCells = weaponRow
      ? weaponRow.querySelectorAll<HTMLElement>(":scope > div")
      : locationRow
        ? [locationRow]
        : this.element.querySelectorAll<HTMLElement>(
            `.contextmenu.item[data-item-id="${CSS.escape(itemId)}"]`,
          );
    const targetItem = this.actor.items.get(itemId) as RqgItem | undefined;
    const dropAction = this._getSameActorDropAction(event, target, targetItem ?? null);

    const targetLocationName = this._getLocationDropTargetName(
      target,
      dropAction,
      targetItem ?? null,
    );
    const isLocationContainerTarget =
      !!target.closest("ul.location") &&
      !!targetItem &&
      isDocumentSubType<PhysicalItem>(targetItem, physicalItemTypes) &&
      !this._isNaturalWeapon(targetItem) &&
      targetItem.system.isContainer;
    const highlightContainer = isLocationContainerTarget
      ? this._getLocationContainerElement(targetItem.name ?? "")
      : targetLocationName
        ? this._getLocationContainerElement(targetLocationName)
        : null;
    highlightContainer?.classList.add("drop-into-container");

    let cls = "drop-after";
    if (dropAction === "before") {
      cls = "drop-before";
    }
    rowCells.forEach((cell) => cell.classList.add(cls));
  }

  private _clearDropIndicators(): void {
    this.element
      .querySelectorAll(".drop-before, .drop-after, .drop-into, .drop-into-container")
      .forEach((el) => {
        el.classList.remove("drop-before", "drop-after", "drop-into", "drop-into-container");
      });
  }

  private _getSameActorDropAction(
    event: DragEvent,
    dropCell: HTMLElement,
    targetItem: RqgItem | null,
  ): "before" | "after" | "into" {
    if (this._isLocationContainerDropTarget(dropCell, targetItem)) {
      if (dropCell.matches(".location-row[data-item-id]")) {
        return "into";
      }

      const rect = dropCell.getBoundingClientRect();
      const upperBoundary = rect.top + rect.height / 3;
      const lowerBoundary = rect.bottom - rect.height / 3;
      if (event.clientY >= upperBoundary && event.clientY <= lowerBoundary) {
        return "into";
      }
    }

    const rect = dropCell.getBoundingClientRect();
    return event.clientY < rect.top + rect.height / 2 ? "before" : "after";
  }

  private _isLocationContainerDropTarget(
    dropCell: HTMLElement,
    targetItem: RqgItem | null,
  ): boolean {
    return (
      !!dropCell.closest("ul.location") &&
      !!targetItem &&
      isDocumentSubType<PhysicalItem>(targetItem, physicalItemTypes) &&
      !this._isNaturalWeapon(targetItem) &&
      targetItem.system.isContainer
    );
  }

  private _getLocationDropTargetName(
    dropCell: HTMLElement,
    dropAction: "before" | "after" | "into",
    targetItem: RqgItem | null,
  ): string | undefined {
    if (
      !dropCell.closest("ul.location") ||
      !targetItem ||
      !isDocumentSubType<PhysicalItem>(targetItem, physicalItemTypes) ||
      this._isNaturalWeapon(targetItem)
    ) {
      return undefined;
    }

    if (dropAction === "into" && targetItem.system.isContainer && targetItem.name) {
      return targetItem.name;
    }

    return targetItem.system.location?.trim() ?? "";
  }

  private _getLocationContainerElement(locationName: string): HTMLElement | null {
    if (!locationName) {
      return null;
    }

    const containerItem = this.actor.items.find(
      (candidate) =>
        candidate.name === locationName &&
        isDocumentSubType<PhysicalItem>(candidate, physicalItemTypes) &&
        !this._isNaturalWeapon(candidate) &&
        candidate.system.isContainer,
    );

    const containerId = containerItem?.id;
    if (!containerId) {
      return null;
    }

    return (
      this.element.querySelector<HTMLElement>(
        `li[data-item-id="${CSS.escape(containerId)}"] > ul.container`,
      ) ??
      this.element.querySelector<HTMLElement>(
        `li[data-item-id="${CSS.escape(containerId)}"] > .location-row`,
      )
    );
  }

  private _isNaturalWeapon(item: RqgItem): boolean {
    return isDocumentSubType<WeaponItem>(item, ItemTypeEnum.Weapon) && item.system.isNatural;
  }

  private async _dropPhysicalItemIntoLocation(
    item: RqgItem,
    targetLocationName: string,
  ): Promise<RqgItem | null> {
    if (
      !isDocumentSubType<PhysicalItem>(item, physicalItemTypes) ||
      this._isNaturalWeapon(item) ||
      !item.name
    ) {
      return null;
    }

    const targetContainer = targetLocationName
      ? (this.actor.items.find(
          (candidate) =>
            candidate.name === targetLocationName &&
            isDocumentSubType<PhysicalItem>(candidate, physicalItemTypes) &&
            !this._isNaturalWeapon(candidate),
        ) as RqgItem | undefined)
      : undefined;

    if (targetContainer) {
      const descendantItemIds = new ItemTree(this.actor.items.contents).getItemIdsBelowNode(
        item.name,
      );
      if (descendantItemIds.includes(targetContainer.id ?? "")) {
        ui.notifications?.warn(
          localize("RQG.Actor.Notification.CantCreateLocationLoopWarn", {
            itemName: item.name,
            targetItemName: targetLocationName,
          }),
        );
        return null;
      }
    }

    await item.update({ system: { location: targetLocationName } });
    return item;
  }

  private static async sortItems(actor: CharacterActor, itemType: string): Promise<void> {
    if (itemType === "physical-by-location") {
      const physicalItems = actor.items.filter(
        (item) =>
          isDocumentSubType<PhysicalItem>(item, physicalItemTypes) &&
          !(isDocumentSubType<WeaponItem>(item, ItemTypeEnum.Weapon) && item.system.isNatural),
      ) as PhysicalItem[];

      const itemsByLocation = new Map<string, PhysicalItem[]>();
      physicalItems.forEach((item) => {
        const location = item.system.location ?? "";
        const itemsInLocation = itemsByLocation.get(location) ?? [];
        itemsInLocation.push(item);
        itemsByLocation.set(location, itemsInLocation);
      });

      const updateData = [...itemsByLocation.values()].flatMap((itemsInLocation) => {
        const sortedItems = [...itemsInLocation].sort((left, right) =>
          (left.name ?? "").localeCompare(right.name ?? ""),
        );

        return sortedItems.map((item, index) => ({
          _id: item.id,
          sort: (index + 1) * CONST.SORT_INTEGER_DENSITY,
        }));
      });

      await actor.updateEmbeddedDocuments("Item", updateData);
      return;
    }

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

  protected override async _onDropItem(event: DragEvent, item: RqgItem): Promise<RqgItem | null> {
    if (!this.actor.isOwner) {
      ui.notifications?.warn(
        localize("RQG.Actor.Notification.NotActorOwnerWarn", { actorName: this.actor.name }),
      );
      return null;
    }

    const dragData = foundry.applications.ux.TextEditor.implementation.getDragEventData(
      event,
    ) as ActorSheet.DropData | null;
    const droppedItem =
      dragData?.type === "Item"
        ? ((await Item.implementation.fromDropData(dragData as object)) as RqgItem | null)
        : null;
    const resolvedItem = droppedItem ?? item;

    const dragActorId =
      dragData && hasOwnProperty(dragData, "actorId") ? dragData.actorId : undefined;
    const dragActorUuid =
      dragData && hasOwnProperty(dragData, "actorUuid") ? dragData.actorUuid : undefined;

    let sourceActor = resolvedItem.parent as RqgActor | null;
    if (!sourceActor && typeof dragActorId === "string") {
      sourceActor = (game.actors?.get(dragActorId) as unknown as RqgActor | undefined) ?? null;
    }
    if (!sourceActor && typeof dragActorUuid === "string") {
      const sourceActorByUuid = await fromUuid(dragActorUuid);
      sourceActor =
        sourceActorByUuid instanceof Actor ? (sourceActorByUuid as unknown as RqgActor) : null;
    }

    const sameActorDrop = sourceActor?.uuid === this.actor.uuid;
    const dropPlacement = this._captureDropPlacement(event);

    // Same actor drop — sort/reorder within this actor.
    if (sameActorDrop) {
      // Try to determine drag context for position-aware sorting
      const eventTarget = getEventTargetElement(event);
      const dropCell =
        eventTarget?.closest<HTMLElement>(".location-row[data-item-id]") ??
        eventTarget?.closest<HTMLElement>(".contextmenu.item[data-item-id]");

      if (dropCell) {
        const targetItemId = dropCell.dataset["itemId"];
        const targetItem = targetItemId
          ? (this.actor.items.get(targetItemId) as RqgItem | undefined)
          : undefined;

        if (targetItem && targetItem.id !== resolvedItem.id) {
          const dropAction = this._getSameActorDropAction(event, dropCell, targetItem);
          const targetLocationName = this._getLocationDropTargetName(
            dropCell,
            dropAction,
            targetItem,
          );
          if (sameActorDrop && targetLocationName !== undefined) {
            const currentLocation =
              isDocumentSubType<PhysicalItem>(resolvedItem, physicalItemTypes) &&
              !this._isNaturalWeapon(resolvedItem)
                ? (resolvedItem.system.location?.trim() ?? "")
                : undefined;

            const shouldMoveLocation =
              dropAction === "into" ||
              (currentLocation !== undefined && currentLocation !== targetLocationName);

            if (shouldMoveLocation) {
              const droppedItem = await this._dropPhysicalItemIntoLocation(
                resolvedItem,
                targetLocationName,
              );
              if (droppedItem) {
                return droppedItem;
              }
            }
          }

          await resolvedItem.sortRelative({
            target: targetItem,
            siblings: this.actor.items.contents.filter(
              (i) => i.id !== resolvedItem.id,
            ) as RqgItem[],
            sortBefore: dropAction === "before",
          });
          return resolvedItem;
        }
      }

      // Default: let Foundry handle it (uses item sort order)
      return super._onDropItem(event, resolvedItem);
    }

    // Sidebar/world/compendium item drops should first create/copy into this actor.
    if (!sourceActor) {
      const createdItems = await this.actor.createEmbeddedDocuments("Item", [
        resolvedItem.toObject(),
      ]);
      const createdItem = createdItems[0] as RqgItem | undefined;
      if (!createdItem) {
        return null;
      }

      await this._applyDropPosition(createdItem, dropPlacement);
      return createdItem;
    }

    // Cross-actor drop
    const itemData = resolvedItem.toObject();

    if (isDocumentSubType<OccupationItem>(resolvedItem, ItemTypeEnum.Occupation)) {
      if (!hasRqid(resolvedItem)) {
        return null;
      }
      await updateRqidLink(this.actor, "background.currentOccupationRqidLink", resolvedItem);
      return resolvedItem;
    }

    if (
      isDocumentSubType<ArmorItem>(itemData as any, ItemTypeEnum.Armor) ||
      isDocumentSubType<GearItem>(itemData as any, ItemTypeEnum.Gear) ||
      isDocumentSubType<WeaponItem>(itemData as any, ItemTypeEnum.Weapon)
    ) {
      const transferResult = await this.confirmTransferPhysicalItem(itemData, sourceActor);
      if (transferResult.kind === "cancelled") {
        return null; // cancelled
      }
      if (transferResult.kind === "failed") {
        return null;
      }
      if (transferResult.kind === "created") {
        await this._applyDropPosition(transferResult.item, dropPlacement);
        return transferResult.item;
      }
      return resolvedItem;
    }

    const success = await this.confirmCopyIntangibleItem(itemData, sourceActor);
    return success ? resolvedItem : null;
  }

  private _captureDropPlacement(event: DragEvent): {
    targetItemId: string;
    dropAction: "before" | "after" | "into";
    targetLocationName: string | undefined;
  } | null {
    const eventTarget = getEventTargetElement(event);
    const dropCell =
      eventTarget?.closest<HTMLElement>(".location-row[data-item-id]") ??
      eventTarget?.closest<HTMLElement>(".contextmenu.item[data-item-id]");

    if (!dropCell) {
      return null;
    }

    const targetItemId = dropCell.dataset["itemId"];
    const targetItem = targetItemId
      ? (this.actor.items.get(targetItemId) as RqgItem | undefined)
      : undefined;

    if (!targetItem || !targetItem.id) {
      return null;
    }

    if (
      !isDocumentSubType<PhysicalItem>(targetItem, physicalItemTypes) ||
      this._isNaturalWeapon(targetItem)
    ) {
      return null;
    }

    const dropAction = this._getSameActorDropAction(event, dropCell, targetItem);
    const targetLocationName = this._getLocationDropTargetName(dropCell, dropAction, targetItem);

    return {
      targetItemId: targetItem.id,
      dropAction,
      targetLocationName,
    };
  }

  /**
   * After an item has been created/transferred onto this actor, sort it relative to
   * the row the user dropped onto and optionally move it into the correct location.
   */
  private async _applyDropPosition(
    createdItem: RqgItem,
    placement: {
      targetItemId: string;
      dropAction: "before" | "after" | "into";
      targetLocationName: string | undefined;
    } | null,
  ): Promise<void> {
    if (!placement) {
      return;
    }

    if (
      !isDocumentSubType<PhysicalItem>(createdItem, physicalItemTypes) ||
      this._isNaturalWeapon(createdItem)
    ) {
      return;
    }

    const targetItem = this.actor.items.get(placement.targetItemId) as RqgItem | undefined;

    if (!targetItem || targetItem.id === createdItem.id) {
      return;
    }

    if (
      !isDocumentSubType<PhysicalItem>(targetItem, physicalItemTypes) ||
      this._isNaturalWeapon(targetItem)
    ) {
      return;
    }

    if (placement.targetLocationName !== undefined) {
      await this._dropPhysicalItemIntoLocation(createdItem, placement.targetLocationName);
    }

    await (createdItem as RqgItem).sortRelative({
      target: targetItem as RqgItem,
      siblings: this.actor.items.contents.filter((i) => i.id !== createdItem.id) as RqgItem[],
      sortBefore: placement.dropAction === "before",
    });
  }

  /**
   * Opens confirmation dialog and transfers the physical item.
   */
  private async confirmTransferPhysicalItem(
    incomingItemDataSource: Item.Implementation["_source"],
    sourceActor: RqgActor,
  ): Promise<PhysicalTransferResult> {
    if ((incomingItemDataSource.system as any).quantity < 1) {
      ui.notifications?.warn(
        localize("RQG.Actor.Notification.NothingToGiveWarn", {
          actorName: sourceActor.name ?? "",
          itemName: incomingItemDataSource.name,
        }),
      );
      return { kind: "cancelled" };
    }

    const adapter: any = {
      incomingItemDataSource: incomingItemDataSource,
      sourceActor: sourceActor,
      targetActor: this.actor,
      showQuantity: (incomingItemDataSource.system as any).quantity > 1,
    };

    const content: string = await foundry.applications.handlebars.renderTemplate(
      templatePaths.confirmTransferPhysicalItem,
      { adapter },
    );

    const title = localize("RQG.Dialog.confirmTransferPhysicalItem.title", {
      itemName: incomingItemDataSource.name,
      targetActor: this.actor.name,
    });

    let transferResult: Exclude<PhysicalTransferResult, { kind: "cancelled" }> = {
      kind: "failed",
    };

    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title },
      content,
      yes: {
        action: "submit",
        label: localize("RQG.Dialog.confirmTransferPhysicalItem.btnGive"),
        icon: "fas fa-check",
        default: true,
        callback: async (_ev: Event, _btn: HTMLButtonElement, dialog: any): Promise<boolean> => {
          const formData = new FormData(dialog.element.querySelector("form") ?? undefined);
          const data = Object.fromEntries(formData.entries());
          const quantityToTransfer = data["numtotransfer"] ? Number(data["numtotransfer"]) : 1;
          transferResult = await this.transferPhysicalItem(
            incomingItemDataSource,
            quantityToTransfer,
            sourceActor,
          );
          return true;
        },
      },
      no: {
        action: "cancel",
        label: localize("RQG.Dialog.Common.btnCancel"),
        icon: "fas fa-times",
        callback: () => false,
      },
    });

    return confirmed ? transferResult : { kind: "cancelled" };
  }

  /**
   * Performs the actual quantity accounting and document CRUD for a physical item transfer.
   */
  private async transferPhysicalItem(
    incomingItemDataSource: Item.Implementation["_source"],
    quantityToTransfer: number,
    sourceActor: RqgActor,
  ): Promise<Exclude<PhysicalTransferResult, { kind: "cancelled" }>> {
    if (!incomingItemDataSource?._id) {
      ui.notifications?.error(localize("RQG.Actor.Notification.NoIncomingItemDataSourceError"));
      return { kind: "failed" };
    }
    if (!hasOwnProperty(incomingItemDataSource.system, "quantity")) {
      ui.notifications?.error(
        localize("RQG.Actor.Notification.IncomingItemDataSourceNotPhysicalItemError"),
      );
      return { kind: "failed" };
    }
    if (quantityToTransfer < 1) {
      ui.notifications?.error(localize("RQG.Actor.Notification.CantTransferLessThanOneItemError"));
      return { kind: "failed" };
    }
    if (quantityToTransfer > (incomingItemDataSource.system as any).quantity) {
      ui.notifications?.error(
        localize("RQG.Actor.Notification.CantTransferMoreThanSourceOwnsError", {
          itemName: incomingItemDataSource.name,
          sourceActorName: sourceActor.name,
        }),
      );
      return { kind: "failed" };
    }

    const canStack =
      hasOwnProperty(incomingItemDataSource.system, "physicalItemType") &&
      incomingItemDataSource.system.physicalItemType !== "unique";
    const existingItem = canStack
      ? (this.actor.items.find(
          (i) => i.name === incomingItemDataSource.name && i.type === incomingItemDataSource.type,
        ) as RqgItem | undefined)
      : undefined;

    const newSourceQty =
      Number((incomingItemDataSource.system as any).quantity) - quantityToTransfer;

    const adjustSource = async (): Promise<void> => {
      if (newSourceQty > 0) {
        await sourceActor.updateEmbeddedDocuments("Item", [
          { _id: incomingItemDataSource._id, system: { quantity: newSourceQty } },
        ]);
      } else {
        await sourceActor.deleteEmbeddedDocuments("Item", [incomingItemDataSource._id as string]);
      }
    };

    if (existingItem) {
      assertDocumentSubType<PhysicalItem>(
        existingItem,
        physicalItemTypes,
        "Existing item found when transferring physical item is not a PhysicalItem",
      );
      const newTargetQty = quantityToTransfer + Number(existingItem.system.quantity);
      await this.actor.updateEmbeddedDocuments("Item", [
        { _id: existingItem.id, system: { quantity: newTargetQty } },
      ]);
      await adjustSource();
      return { kind: "merged" };
    }

    (incomingItemDataSource.system as any).quantity = quantityToTransfer;
    const created = await this.actor.createEmbeddedDocuments("Item", [incomingItemDataSource]);

    if (created.length < 1) {
      return { kind: "failed" };
    }

    await adjustSource();
    return { kind: "created", item: created[0] as RqgItem };
  }

  private async confirmCopyIntangibleItem(
    incomingItemDataSource: Item.Implementation["_source"],
    sourceActor: RqgActor,
  ): Promise<boolean> {
    const adapter: any = {
      incomingItemDataSource,
      sourceActor,
      targetActor: this.actor,
    };
    const content: string = await foundry.applications.handlebars.renderTemplate(
      templatePaths.confirmCopyIntangibleItem,
      { adapter },
    );

    const title = localize("RQG.Dialog.confirmCopyIntangibleItem.title", {
      itemName: incomingItemDataSource.name,
      targetActor: this.actor.name,
    });
    const result = await foundry.applications.api.DialogV2.confirm({
      window: { title },
      content,
      yes: {
        action: "submit",
        label: localize("RQG.Dialog.confirmCopyIntangibleItem.btnCopy"),
        icon: "fas fa-check",
        default: true,
        callback: async (): Promise<boolean> => {
          const created = await this.actor.createEmbeddedDocuments("Item", [
            incomingItemDataSource,
          ]);
          return created.length > 0;
        },
      },
      no: {
        action: "cancel",
        label: localize("RQG.Dialog.Common.btnCancel"),
        icon: "fas fa-times",
        callback: () => false,
      },
    });
    return Boolean(result);
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

  /**
   * An event that occurs when data is dropped into a drop target.
   * @param event - The originating drag event.
   */
  protected override async _onDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    this._resetDragVisualState();

    const eventTarget = getEventTargetElement(event);
    if (eventTarget?.closest<HTMLElement>("[data-dropzone]")) {
      await this._onDropRqidDocument(event);
      return;
    }

    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(
      event,
    ) as ActorSheet.DropData;

    // Handle compendium drops specially to embed all items from the pack
    if (data?.type === "Compendium") {
      if (!this.actor.isOwner) {
        ui.notifications?.warn(
          localize("RQG.Actor.Notification.NotActorOwnerWarn", { actorName: this.actor.name }),
        );
        return;
      }
      await this._onDropCompendium(event, data);
      return;
    }

    // For all other types, delegate to parent
    await super._onDrop(event);
  }

  private async _onDropCompendium(event: DragEvent, data: ActorSheet.DropData): Promise<RqgItem[]> {
    if (!this.actor.isOwner) {
      return [];
    }
    const compendiumId = hasOwnProperty(data, "collection") ? data.collection : undefined;
    if (typeof compendiumId !== "string") {
      return [];
    }
    const pack = game.packs?.get(compendiumId);
    const packIndex = await pack?.getIndex();
    if (!packIndex) {
      return [];
    }
    const documents = (await Promise.all(
      packIndex.map(async (di) => {
        const doc = await fromUuid(di.uuid);
        return doc?.toObject();
      }),
    )) as Item.Implementation["_source"][];

    const itemDataToCreate = documents.filter(isTruthy);
    if (itemDataToCreate.length === 0) {
      return [];
    }

    const createdItems = await this.actor.createEmbeddedDocuments("Item", itemDataToCreate);
    return createdItems as RqgItem[];
  }
}
