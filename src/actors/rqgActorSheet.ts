import { HomeLandEnum, OccupationEnum } from "../data-model/actor-data/background";
import {
  type AbilityItem,
  abilityItemTypes,
  ItemTypeEnum,
  type PhysicalItem,
} from "@item-model/itemTypes.ts";
import { HitLocationSheet } from "../items/hit-location-item/hitLocationSheet";
import { skillMenuOptions } from "./context-menus/skill-context-menu";
import { combatMenuOptions } from "./context-menus/combat-context-menu";
import { hitLocationMenuOptions } from "./context-menus/hit-location-context-menu";
import { passionMenuOptions } from "./context-menus/passion-context-menu";
import { gearMenuOptions } from "./context-menus/gear-context-menu";
import { spiritMagicMenuOptions } from "./context-menus/spirit-magic-context-menu";
import { cultMenuOptions } from "./context-menus/cult-context-menu";
import { runeMagicMenuOptions } from "./context-menus/rune-magic-context-menu";
import { runeMenuOptions } from "./context-menus/rune-context-menu";
import type { ActorSheetTemplateContext } from "./rqgActorSheet.types";
import * as DataPrep from "./rqgActorSheetDataPrep";
import {
  type EquippedStatus,
  equippedStatuses,
  type PhysicalItemType,
  physicalItemTypes,
} from "@item-model/IPhysicalItem.ts";
import { characteristicMenuOptions } from "./context-menus/characteristic-context-menu";
import {
  assertDocumentSubType,
  assertHtmlElement,
  getHTMLElement,
  getRequiredDomDataset,
  hasOwnProperty,
  isDocumentSubType,
  isTruthy,
  localize,
  localizeItemType,
  range,
  requireValue,
  RqgError,
  usersIdsThatOwnActor,
} from "../system/util";
import { DamageCalculations } from "../system/damageCalculations";
import { actorHealthStatuses, LocomotionEnum } from "../data-model/actor-data/attributes";
import {
  ActorTypeEnum,
  type CharacterActor,
  type CharacterDataPropertiesData,
} from "../data-model/actor-data/rqgActorData";
import { ActorWizard } from "../applications/actorWizardApplication";
import { RQG_CONFIG, systemId } from "../system/config";
import { RqidLink } from "../data-model/shared/rqidLink";
import { actorWizardFlags } from "../data-model/shared/rqgDocumentFlags";
import { addRqidLinkToSheetJQuery } from "../documents/rqidSheetButton";
import { RqgContextMenu } from "../foundryUi/RqgContextMenu";
import { RqgAsyncDialog } from "../applications/rqgAsyncDialog";
import {
  extractDropInfo,
  getAllowedDropDocumentNames,
  hasRqid,
  isAllowedDocumentNames,
  onDragEnter,
  onDragLeave,
  updateRqidLink,
} from "../documents/dragDrop";
import { ItemTree } from "../items/shared/ItemTree";
import { type CultItem } from "@item-model/cultData.ts";
import type { RqgActor } from "./rqgActor";
import type { RqgItem } from "../items/rqgItem";
import { getCombatantIdsToDelete, getSrWithoutCombatants } from "../combat/combatant-utils";
import { templatePaths } from "../system/loadHandlebarsTemplates";
import { DamageRoll } from "../rolls/DamageRoll/DamageRoll";
import {
  applyDamageBonusToFormula,
  formatDamagePart,
  getNormalizedDamageFormulaAndDamageBonus,
} from "../system/combatCalculations";
import type { NewCombatant } from "../combat/rqgCombatant.types";
import type { RuneMagicItem } from "@item-model/runeMagicData.ts";
import type { WeaponItem } from "@item-model/weaponData.ts";
import type { GearItem } from "@item-model/gearData.ts";
import type { SpiritMagicItem } from "@item-model/spiritMagicData.ts";
import type { OccupationItem } from "@item-model/occupationData.ts";
import type { ArmorItem } from "@item-model/armorData.ts";
import type { RqgActiveEffect } from "../active-effect/rqgActiveEffect.ts";

import ActorSheet = foundry.appv1.sheets.ActorSheet;

export class RqgActorSheet<
  Options extends ActorSheet.Options = ActorSheet.Options,
> extends ActorSheet<Options> {
  override get actor(): CharacterActor {
    return super.document as CharacterActor;
  }

  // What SRs is this actor doing things in. Not persisted data, controlling active combat.
  private activeInSR: Set<number> = new Set<number>();
  private incorrectRunes: RqgItem[] = [];

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

  static override get defaultOptions(): ActorSheet.Options {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: [systemId, "sheet", ActorTypeEnum.Character],
      template: templatePaths.rqgActorSheet,
      width: 900,
      height: 700,
      tabs: [
        {
          navSelector: ".sheet-tabs",
          contentSelector: ".sheet-body",
          initial: "combat",
        },
        {
          navSelector: ".gear-tabs",
          contentSelector: ".gear-body",
          initial: "by-item-type",
        },
      ],
      dragDrop: [{ dragSelector: ".item-list .item", dropSelector: "[data-dropzone]" }],
    });
  }

  /* -------------------------------------------- */

  // TODO Add & remove appId when this is an appv2 application
  /** @override */
  // async _onFirstRender(context: any, options: any): Promise<void> {
  //   // @ts-expect-error _onFirstRender
  //   await super._onFirstRender(context, options);
  //
  //   // @ts-expect-error getCombatantByActor
  //   const actorCombatants: Combatant[] | undefined = game.combat?.getCombatantsByActor(
  //     this.actor,
  //   );
  //   actorCombatants?.forEach((c) => (c.apps[this.appId] = this));
  // }
  //
  // /** @override */
  // _onPreClose(options: any): void {
  //   // @ts-expect-error _onPreClose
  //   super._onPreClose(options);
  //   // @ts-expect-error getCombatantByActor
  //   const actorCombatants: Combatant[] | undefined = game.combat?.getCombatantsByActor(
  //     this.actor,
  //   );
  //   actorCombatants?.forEach((c) => delete c.apps[this.appId]);
  // }

  override async _render(force = false, options: Application.RenderOptions<Options> = {}) {
    await super._render(force, options);
    const actorCombatants: Combatant.Implementation[] =
      game.combat?.getCombatantsByActor(this.actor) ?? [];
    actorCombatants?.forEach((c) => (c.apps[this.appId] = this as any));
  }

  override async close(options: FormApplication.CloseOptions = {}) {
    if (hasOwnProperty(options, "renderContext") && options.renderContext === "deleteCombatant") {
      // Don't close the actor sheet even is a combatant linked to it that is deleted,
      // but try to remove the combatant.apps reference.
      // This is is a workaround - can I remove the app reference in a better way?
      const actorCombatants: Combatant[] | undefined = game.combat?.getCombatantsByActor(
        this.actor,
      );
      actorCombatants?.forEach((c) => delete c.apps[this.appId]);
    } else {
      return super.close(options);
    }
  }

  override async getData(): Promise<ActorSheetTemplateContext> {
    this.incorrectRunes = [];
    const system = foundry.utils.duplicate(this.actor.system) as CharacterDataPropertiesData;
    const spiritMagicPointSum = DataPrep.getSpiritMagicPointSum(this.actor);
    const dexStrikeRank = system.attributes.dexStrikeRank;
    const itemTree = new ItemTree(this.actor.items.contents); // physical items reorganised as a tree of items containing items

    const actorCombatants: Combatant[] | undefined = game.combat?.getCombatantsByActor(this.actor);

    this.activeInSR = new Set(
      actorCombatants
        ?.map((c) => c.initiative)
        .filter(isTruthy)
        .filter((sr: number) => sr >= 1 && sr <= 12),
    );

    const embeddedItems = await DataPrep.organizeEmbeddedItems(this.actor, this.incorrectRunes);

    return {
      id: this.actor.id ?? "",
      uuid: this.actor.uuid,
      name: this.actor.name ?? "",
      img: this.actor.img ?? "",
      isEditable: this.isEditable,
      isGM: game.user?.isGM ?? false,
      isPC: this.actor.hasPlayerOwner,
      showCharacteristicRatings: game.settings?.get(systemId, "showCharacteristicRatings") || false,
      system: system,
      effects: [...this.actor.allApplicableEffects()],

      embeddedItems: embeddedItems,

      spiritCombatSkillData: this.actor.getBestEmbeddedDocumentByRqid(
        RQG_CONFIG.skillRqid.spiritCombat,
      ),
      dodgeSkillData: this.actor.getBestEmbeddedDocumentByRqid(RQG_CONFIG.skillRqid.dodge),

      mainCult: DataPrep.getMainCultInfo(this.actor),
      characterElementRunes: DataPrep.getCharacterElementRuneImgs(this.actor), // Sorted array of element runes with > 0% chance
      characterPowerRunes: DataPrep.getCharacterPowerRuneImgs(this.actor), // Sorted array of power runes with > 50% chance
      characterFormRunes: DataPrep.getCharacterFormRuneImgs(this.actor), // Sorted array of form runes that define the character
      loadedMissileSrDisplay: DataPrep.getLoadedMissileSrDisplay(dexStrikeRank), // (html) Precalculated missile weapon SRs if loaded at start of round
      loadedMissileSr: DataPrep.getLoadedMissileSr(dexStrikeRank),
      unloadedMissileSrDisplay: DataPrep.getUnloadedMissileSrDisplay(dexStrikeRank), // (html) Precalculated missile weapon SRs if not loaded at start of round
      unloadedMissileSr: DataPrep.getUnloadedMissileSr(dexStrikeRank),
      itemLocationTree: itemTree.toSheetData(),
      powCrystals: DataPrep.getPowCrystals(this.actor),
      spiritMagicPointSum: spiritMagicPointSum,
      freeInt: DataPrep.getFreeInt(this.actor, spiritMagicPointSum),
      baseStrikeRank: DataPrep.getBaseStrikeRank(dexStrikeRank, system.attributes.sizStrikeRank),
      enrichedAllies: await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        system.allies,
      ),
      enrichedBiography: await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        system.background.biography ?? "",
      ),

      // Lists for dropdown values
      occupationOptions: Object.values(OccupationEnum).map((occupation) => ({
        value: occupation,
        label: localize("RQG.Actor.Background.Occupation." + (occupation || "none")),
      })),
      homelands: Object.values(HomeLandEnum),
      locations: itemTree.getPhysicalItemLocations(),
      healthStatuses: [...actorHealthStatuses],
      ownedProjectileOptions: DataPrep.getEquippedProjectileOptions(this.actor),
      locomotionModes: {
        [LocomotionEnum.Walk]: "Walk",
        [LocomotionEnum.Swim]: "Swim",
        [LocomotionEnum.Fly]: "Fly",
      },

      currencyTotals: DataPrep.calcCurrencyTotals(this.actor),
      isInCombat: this.actor.inCombat,

      dexSR: [...range(1, this.actor.system.attributes.dexStrikeRank ?? 0)],
      sizSR: [
        ...range(
          (this.actor.system.attributes.dexStrikeRank ?? 0) + 1,
          (this.actor.system.attributes.sizStrikeRank ?? 0) +
            (this.actor.system.attributes.dexStrikeRank ?? 0),
        ),
      ],

      otherSR: [
        ...range(
          (this.actor.system.attributes.dexStrikeRank ?? 0) +
            (this.actor.system.attributes.sizStrikeRank ?? 0) +
            1,
          12,
        ),
      ],
      activeInSR: [...this.activeInSR],

      characteristicRanks: await DataPrep.rankCharacteristics(this.actor),
      bodyType: this.actor.getBodyType(),
      hitLocationDiceRangeError: DataPrep.getHitLocationDiceRangeError(this.actor),

      // UI toggles
      showHeropoints: game.settings?.get(systemId, "showHeropoints") ?? false,
      showUiSection: DataPrep.getUiSectionVisibility(this.actor),
      actorWizardFeatureFlag: game.settings?.get(systemId, "actor-wizard-feature-flag") ?? false,
      itemLoopMessage: itemTree.loopMessage,
      enrichedUnspecifiedSkill: await DataPrep.getUnspecifiedSkillText(this.actor),
      enrichedIncorrectRunes: await DataPrep.getIncorrectRunesText(
        this.actor,
        embeddedItems?.rune,
        this.incorrectRunes,
      ),
    };
  }

  protected override _updateObject(event: Event, formData: any): Promise<unknown> {
    const maxHitPoints = this.actor.system.attributes.hitPoints.max;

    if (
      formData["system.attributes.hitPoints.value"] == null || // Actors without hit locations should not get undefined
      (formData["system.attributes.hitPoints.value"] ?? 0) >= (maxHitPoints ?? 0)
    ) {
      formData["system.attributes.hitPoints.value"] = maxHitPoints;
    }

    // Hack: Temporarily change hp.value to what it will become so getCombinedActorHealth will work
    const hpTmp = this.actor.system.attributes.hitPoints.value;
    const mpTmp = this.actor.system.attributes.magicPoints.value;

    this.actor.system.attributes.hitPoints.value = formData["system.attributes.hitPoints.value"];
    this.actor.system.attributes.magicPoints.value =
      formData["system.attributes.magicPoints.value"];

    const newHealth = DamageCalculations.getCombinedActorHealth(this.actor);
    if (newHealth !== this.actor.system.attributes.health) {
      const speaker = ChatMessage.getSpeaker({ actor: this.actor, token: this.token });
      const speakerName = speaker.alias;
      let message;
      if (newHealth === "dead" && !this.token?.actor?.statuses.has("dead")) {
        message = `${speakerName} runs out of hitpoints and dies here and now!`;
      }
      if (newHealth === "unconscious" && !this.token?.actor?.statuses.has("unconscious")) {
        message = `${speakerName} faints from lack of hitpoints!`;
      }
      if (message) {
        ChatMessage.create({
          speaker: speaker,
          content: message,
          whisper: usersIdsThatOwnActor(this.actor),
          style: CONST.CHAT_MESSAGE_STYLES.WHISPER,
        });
      }
    }

    this.actor.system.attributes.hitPoints.value = hpTmp; // Restore hp so the form will work
    this.actor.system.attributes.magicPoints.value = mpTmp;
    this.actor.system.attributes.health = newHealth; // "Pre update" the health to make the setTokenEffect call work
    void this.actor.updateTokenEffectFromHealth();

    formData["system.attributes.health"] = newHealth;

    return super._updateObject(event, formData);
  }

  override _contextMenu(html: HTMLElement | JQuery<HTMLElement>): void {
    const htmlElement = html instanceof HTMLElement ? html : html[0];
    if (!htmlElement) {
      return;
    }

    new RqgContextMenu(
      htmlElement,
      ".characteristic.contextmenu",
      characteristicMenuOptions(this.actor, this.token),
    );

    new RqgContextMenu(htmlElement, ".combat.contextmenu", combatMenuOptions(this.actor));

    new RqgContextMenu(
      htmlElement,
      ".hit-location.contextmenu",
      hitLocationMenuOptions(this.actor),
    );

    new RqgContextMenu(
      htmlElement,
      ".rune.contextmenu",
      runeMenuOptions(this.actor, this.token ?? undefined),
    );

    new RqgContextMenu(
      htmlElement,
      ".spirit-magic.contextmenu",
      spiritMagicMenuOptions(this.actor),
    );

    new RqgContextMenu(htmlElement, ".cult.contextmenu", cultMenuOptions(this.actor));

    new RqgContextMenu(htmlElement, ".cult-tab.contextmenu", cultMenuOptions(this.actor), {
      fixed: true,
      onOpen: (target: HTMLElement) => target.classList.add("context-highlight"),
      onClose: (target: HTMLElement) => target.classList.remove("context-highlight"),
    });

    new RqgContextMenu(htmlElement, ".rune-magic.contextmenu", runeMagicMenuOptions(this.actor));

    new RqgContextMenu(
      htmlElement,
      ".skill.contextmenu",
      skillMenuOptions(this.actor, this.token ?? undefined),
    );

    new RqgContextMenu(htmlElement, ".gear.contextmenu", gearMenuOptions(this.actor));

    new RqgContextMenu(
      htmlElement,
      ".passion.contextmenu",
      passionMenuOptions(this.actor, this.token ?? undefined),
    );
  }

  override activateListeners(html: JQuery): void {
    super.activateListeners(html);
    if (!this.actor.isOwner) {
      // Only owners are allowed to interact
      return;
    }
    const htmlElement = html[0];
    // Foundry doesn't provide dragenter & dragleave in its DragDrop handling
    htmlElement?.parentElement?.querySelectorAll<HTMLElement>("[data-dropzone]").forEach((elem) => {
      elem.addEventListener("dragenter", this._onDragEnter);
      elem.addEventListener("dragleave", this._onDragLeave);
    });

    // This is a hack to prevent activating button click listeners when typing return in input boxes
    // This invisible button at the start of the form will catch the event and do nothing.
    htmlElement?.querySelectorAll<HTMLElement>("[data-return-sink]").forEach((el) => {
      el.addEventListener("click", async () => {
        (document.activeElement as HTMLElement)?.blur();
      });
    });

    if (htmlElement) {
      this._contextMenu(htmlElement);
    }

    // Use attributes data-item-edit, data-item-delete & data-item-roll to specify what should be clicked to perform the action
    // Set data-item-edit=actor.items._id on the same or an outer element to specify what item the action should be performed on.
    // Roll actor Characteristic
    htmlElement?.querySelectorAll<HTMLElement>("[data-characteristic-roll]").forEach((el) => {
      const closestDataCharacteristic = el.closest("[data-characteristic]");
      assertHtmlElement(closestDataCharacteristic);
      const characteristicName = closestDataCharacteristic?.dataset["characteristic"] as
        | keyof typeof actorCharacteristics
        | undefined;

      let clickCount = 0;
      const actorCharacteristics = this.actor.system.characteristics;
      if (!characteristicName || !(characteristicName in actorCharacteristics)) {
        const msg = `Characteristic [${characteristicName}] isn't found on actor [${this.actor.name}].`;
        ui.notifications?.error(msg);
        throw new RqgError(msg, this.actor);
      }
      el.addEventListener("click", async (ev: MouseEvent) => {
        clickCount = Math.max(clickCount, ev.detail);

        if (clickCount >= 2) {
          await this.actor.characteristicRollImmediate(characteristicName);

          clickCount = 0;
        } else if (clickCount === 1) {
          setTimeout(async () => {
            if (clickCount === 1) {
              await this.actor.characteristicRoll(characteristicName);
            }
            clickCount = 0;
          }, CONFIG.RQG.dblClickTimeout);
        }
      });
    });

    // Roll actor Reputation
    htmlElement?.querySelectorAll<HTMLElement>("[data-reputation-roll]").forEach((el) => {
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
          }, CONFIG.RQG.dblClickTimeout);
        }
      });
    });

    // Roll Item (Rune, Skill, Passion)
    htmlElement?.querySelectorAll<HTMLElement>("[data-item-roll]").forEach((el) => {
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

    // Roll Rune Magic
    htmlElement?.querySelectorAll<HTMLElement>("[data-rune-magic-roll]").forEach((el) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const runeMagicItem = this.actor.getEmbeddedDocument("Item", itemId, {});
      assertDocumentSubType<RuneMagicItem>(runeMagicItem, ItemTypeEnum.RuneMagic);
      let clickCount = 0;

      el.addEventListener("click", async (ev: MouseEvent) => {
        assertDocumentSubType<RuneMagicItem>(runeMagicItem, ItemTypeEnum.RuneMagic);
        clickCount = Math.max(clickCount, ev.detail);
        if (clickCount >= 2) {
          if (runeMagicItem.system.points > 1) {
            await runeMagicItem?.runeMagicRoll();
          } else {
            await runeMagicItem?.runeMagicRollImmediate();
          }

          clickCount = 0;
        } else if (clickCount === 1) {
          setTimeout(async () => {
            if (clickCount === 1) {
              await runeMagicItem?.runeMagicRoll();
            }
            clickCount = 0;
          }, CONFIG.RQG.dblClickTimeout);
        }
      });
    });

    // Roll Spirit Magic
    htmlElement?.querySelectorAll<HTMLElement>("[data-spirit-magic-roll]").forEach((el) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = this.actor.items.get(itemId) as RqgItem | undefined;
      assertDocumentSubType<SpiritMagicItem>(
        item,
        ItemTypeEnum.SpiritMagic,
        "Couldn't find item [${itemId}] to roll Spirit Magic against",
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

    // Roll Weapon Ability (send to chat)
    htmlElement?.querySelectorAll<HTMLElement>("[data-weapon-roll]").forEach((el) => {
      const weaponItemId = getRequiredDomDataset(el, "weapon-item-id");
      const weapon = this.actor.items.get(weaponItemId) as RqgItem | undefined;
      assertDocumentSubType<WeaponItem>(weapon, ItemTypeEnum.Weapon);

      let clickCount = 0;
      el.addEventListener("click", async (ev: MouseEvent) => {
        if ((ev.target as HTMLElement)?.tagName === "SELECT") {
          return; // User clicked on a select element above this element - don't interpret it as an attack
        }

        clickCount = Math.max(clickCount, ev.detail);
        if (clickCount >= 2) {
          // Ignore double clicks by doing the same as on single click
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

    // Flip hit location sort order
    htmlElement
      ?.querySelectorAll<HTMLElement>("[data-flip-sort-hitlocation-setting]")
      .forEach((el) => {
        el.addEventListener("click", async () => {
          const currentValue = game.settings?.get(systemId, "sortHitLocationsLowToHigh");
          await game.settings?.set(systemId, "sortHitLocationsLowToHigh", !currentValue);
          // Rerender all actor sheets the user has open
          Object.values(ui.windows).forEach((a: any) => {
            if (isDocumentSubType<CharacterActor>(a?.document, ActorTypeEnum.Character)) {
              a.render();
            }
          });
        });
      });

    // Set comma separated Token SRs in Combat Tracker
    htmlElement?.querySelectorAll<HTMLElement>("[data-set-sr]").forEach((el: HTMLElement) => {
      const srValue = getRequiredDomDataset(el, "set-sr");
      const srToAdd = srValue.split(",").map((v) => Number(v.trim()));
      el.addEventListener("click", async () => {
        this.activeInSR = new Set(srToAdd);
        await this.updateActiveCombatWithSR(this.activeInSR);
      });
    });

    htmlElement?.querySelectorAll<HTMLElement>("[data-toggle-sr]").forEach((el: HTMLElement) => {
      const sr = Number(getRequiredDomDataset(el, "toggle-sr"));

      el.addEventListener("click", async () => {
        if (this.activeInSR.has(sr)) {
          this.activeInSR.delete(sr);
        } else {
          this.activeInSR.add(sr);
        }
        await this.updateActiveCombatWithSR(this.activeInSR);
      });
    });

    // Edit Item (open the item sheet)
    htmlElement?.querySelectorAll<HTMLElement>("[data-item-edit]").forEach((el) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      const item = this.actor.items.get(itemId) as RqgItem | undefined;
      if (!item || !item.sheet) {
        const msg = `Couldn't find itemId [${itemId}] on actor ${this.actor.name} to open item sheet (during setup).`;
        ui.notifications?.error(msg);
        throw new RqgError(msg);
      }
      el.addEventListener("click", () => item.sheet!.render(true));
    });

    // Delete Item (remove item from actor)
    htmlElement?.querySelectorAll<HTMLElement>("[data-item-delete]").forEach((el) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      el.addEventListener("click", () => RqgActorSheet.confirmItemDelete(this.actor, itemId));
    });

    // Sort Items alphabetically
    htmlElement?.querySelectorAll<HTMLElement>("[data-sort-items]").forEach((el) => {
      const itemType = getRequiredDomDataset(el, "sort-items");
      el.addEventListener("click", () => RqgActorSheet.sortItems(this.actor, itemType));
    });

    // Cycle the equipped state of a physical Item
    htmlElement?.querySelectorAll<HTMLElement>("[data-item-equipped-toggle]").forEach((el) => {
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
            (equippedStatuses.indexOf(item.system.equippedStatus) + 1) % equippedStatuses.length
          ];
        // Will trigger an Actor#_onModifyEmbeddedEntity that will update the other physical items in the same location tree
        await item.update({ system: { equippedStatus: newStatus } });
      });
    });

    // Edit item value
    htmlElement?.querySelectorAll<HTMLInputElement>("[data-item-edit-value]").forEach((el) => {
      const path = getRequiredDomDataset(el, "item-edit-value");
      const itemId = getRequiredDomDataset(el, "item-id");
      el.addEventListener("change", async (event) => {
        const item = this.actor.items.get(itemId) as RqgItem | undefined;
        requireValue(item, `Couldn't find itemId [${itemId}] to edit an item (when clicked).`);
        await item.update({ [path]: (event.target as HTMLInputElement)?.value }, {});
      });
    });

    // Add wound to hit location
    htmlElement?.querySelectorAll<HTMLElement>("[data-item-add-wound]").forEach((el) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      el.addEventListener("click", () => HitLocationSheet.showAddWoundDialog(this.actor, itemId));
    });

    // Heal wounds to hit location
    htmlElement?.querySelectorAll<HTMLElement>("[data-item-heal-wound]").forEach((el) => {
      const itemId = getRequiredDomDataset(el, "item-id");
      el.addEventListener("click", () => HitLocationSheet.showHealWoundDialog(this.actor, itemId));
    });

    // Edit Actor Active Effect
    htmlElement?.querySelectorAll<HTMLElement>("[data-actor-effect-edit]").forEach((el) => {
      const effectUuid = getRequiredDomDataset(el, "effect-uuid");
      el.addEventListener("click", () => {
        const effect = fromUuidSync(effectUuid) as RqgActiveEffect | undefined;
        requireValue(effect, `No active effect id [${effectUuid}] to edit the effect`);
        new foundry.applications.sheets.ActiveEffectConfig({ document: effect }).render(true);
      });
    });

    // Delete Item Active Effect
    htmlElement?.querySelectorAll<HTMLElement>("[data-actor-effect-delete]").forEach((el) => {
      const effectUuid = getRequiredDomDataset(el, "effect-uuid");
      el.addEventListener("click", () => {
        // @ts-expect-error fromUuidSync
        fromUuidSync(effectUuid)?.delete();
      });
    });

    // Roll Damage for spirit magic, separate damage bonus and weapon damage
    htmlElement?.querySelectorAll<HTMLElement>("[data-damage-roll]").forEach((el) => {
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

    // Handle rqid links
    void RqidLink.addRqidLinkClickHandlersToJQuery(html);

    // Handle deleting RqidLinks from RqidLink Array Properties
    $(htmlElement!)
      .find("[data-delete-from-property]")
      .each((i: number, el: HTMLElement) => {
        const deleteRqid = getRequiredDomDataset($(el), "delete-rqid");
        const deleteFromPropertyName = getRequiredDomDataset($(el), "delete-from-property");
        el.addEventListener("click", async () => {
          const deleteFromProperty = foundry.utils.getProperty(
            this.actor.system,
            deleteFromPropertyName,
          );
          if (Array.isArray(deleteFromProperty)) {
            const newValueArray = (deleteFromProperty as RqidLink[]).filter(
              (r) => r.rqid !== deleteRqid,
            );
            await this.actor.update({ system: { [deleteFromPropertyName]: newValueArray } });
          } else {
            await this.actor.update({ system: { [deleteFromPropertyName]: "" } });
          }
        });
      });

    // Add Passion button
    htmlElement?.querySelectorAll<HTMLElement>("[data-passion-add]").forEach((el) => {
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

    // handle in-grid editing of runes
    htmlElement?.querySelectorAll<HTMLElement>("[data-rune-grid-edit]").forEach((el) => {
      el.addEventListener("change", async (event) => {
        const updateId = getRequiredDomDataset($(el), "item-id");
        const newChance = parseInt((event.target as HTMLInputElement).value);
        await this.actor.updateEmbeddedDocuments("Item", [
          { _id: updateId, system: { chance: newChance } },
        ]);
      });
    });

    // handle in-grid editing of skills
    htmlElement?.querySelectorAll<HTMLElement>("[data-skill-grid-edit]").forEach((el) => {
      el.addEventListener("change", async (event) => {
        const updateId = getRequiredDomDataset($(el), "item-id");
        const newGainedChance = parseInt((event.target as HTMLInputElement).value);
        await this.actor.updateEmbeddedDocuments("Item", [
          { _id: updateId, system: { gainedChance: newGainedChance } },
        ]);
      });
    });

    // handle in-grid editing of passions
    htmlElement?.querySelectorAll<HTMLElement>("[data-passion-grid-edit]").forEach((el) => {
      el.addEventListener("change", async (event) => {
        const updateId = getRequiredDomDataset($(el), "item-id");
        const newChance = parseInt((event.target as HTMLInputElement).value);
        await this.actor.updateEmbeddedDocuments("Item", [
          { _id: updateId, system: { chance: newChance } },
        ]);
      });
    });

    // Add Gear buttons
    htmlElement?.querySelectorAll<HTMLElement>("[data-gear-add]").forEach((el) => {
      const physicalItemType = getRequiredDomDataset(el, "gear-add");
      el.addEventListener("click", async () => {
        const defaultItemIconSettings: any = game.settings?.get(
          systemId,
          "defaultItemIconSettings",
        );

        const physicalItemType2ItemName = new Map<PhysicalItemType, string>([
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
  }

  private async updateActiveCombatWithSR(activeInSR: Set<number>) {
    const combat = game.combat;
    if (!combat) {
      throw new RqgError(
        "Programming error: updateActiveCombatWithSR should not be run if there are no combats.",
      );
    }

    const currentCombatants = combat.getCombatantsByActor(this.actor);

    // Delete combatants that don't match activeInSR
    const combatantIdsToDelete = getCombatantIdsToDelete(currentCombatants, activeInSR);
    await combat.deleteEmbeddedDocuments("Combatant", combatantIdsToDelete);

    if (activeInSR.size === 0) {
      await currentCombatants[0]?.update({ initiative: null });
    }

    // Create new Combatants for missing SR
    const srWithoutCombatants = getSrWithoutCombatants(currentCombatants, activeInSR);

    const newCombatants: NewCombatant[] = srWithoutCombatants
      .map((sr) => ({
        actorId: currentCombatants[0]?.actorId,
        tokenId: currentCombatants[0]?.tokenId,
        sceneId: currentCombatants[0]?.sceneId,
        initiative: sr,
      }))
      .filter(isTruthy);
    await combat.createEmbeddedDocuments("Combatant", newCombatants);
  }

  static async confirmItemDelete(actor: RqgActor, itemId: string): Promise<void> {
    const item = actor.items.get(itemId) as RqgItem | undefined;
    requireValue(item, `No itemId [${itemId}] on actor ${actor.name} to show delete item Dialog`);

    const itemTypeLoc: string = localizeItemType(item.type);

    const title = localize("RQG.Dialog.confirmItemDeleteDialog.title", {
      itemType: itemTypeLoc,
      itemName: item.name,
    });

    let content: string;
    if (isDocumentSubType<CultItem>(item, ItemTypeEnum.Cult)) {
      content = localize("RQG.Dialog.confirmItemDeleteDialog.contentCult", {
        itemType: itemTypeLoc,
        itemName: item.name,
        runeMagicSpell: localizeItemType(ItemTypeEnum.RuneMagic),
      });
    } else {
      content = localize("RQG.Dialog.confirmItemDeleteDialog.content", {
        itemType: itemTypeLoc,
        itemName: item.name,
      });
    }

    const confirmDialog = new RqgAsyncDialog<boolean>(title, content);

    const buttons = {
      submit: {
        icon: '<i class="fas fa-check"></i>',
        label: localize("RQG.Dialog.Common.btnConfirm"),
        callback: async () => confirmDialog.resolve(true),
      },
      cancel: {
        icon: '<i class="fas fa-times"></i>',
        label: localize("RQG.Dialog.Common.btnCancel"),
        callback: () => confirmDialog.resolve(false),
      },
    };

    if (await confirmDialog.setButtons(buttons, "cancel").show()) {
      const idsToDelete = [];
      if (isDocumentSubType<CultItem>(item, ItemTypeEnum.Cult)) {
        const cultId = item.id;
        const runeMagicSpells = actor.items.filter(
          (i) =>
            isDocumentSubType<RuneMagicItem>(i, ItemTypeEnum.RuneMagic) &&
            i.system.cultId === cultId,
        ) as RuneMagicItem[];
        runeMagicSpells.forEach((s) => {
          idsToDelete.push(s.id);
        });
      }

      idsToDelete.push(itemId);
      await actor.deleteEmbeddedDocuments("Item", idsToDelete);
    }
  }

  _onDragEnter(event: DragEvent): void {
    onDragEnter(event);
  }

  _onDragLeave(event: DragEvent): void {
    onDragLeave(event);
  }

  protected override async _onDrop(event: DragEvent): Promise<unknown> {
    event.preventDefault(); // Allow the drag to be dropped
    this.render(true); // Rerender instead of calling removeDragHoverClass to get rid of any dragHover classes. They are nested in the actorSheet.

    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(
      event,
    ) as ActorSheet.DropData;
    const allowedDropDocumentNames = getAllowedDropDocumentNames(event);
    if (
      data?.type !== "Compendium" &&
      !isAllowedDocumentNames(data?.type, allowedDropDocumentNames)
    ) {
      return false;
    }

    const actor = this.actor;

    /**
     * A hook event that fires when some useful data is dropped onto an ActorSheet.
     * @function dropActorSheetData
     * @memberof hookEvents
     * @param {Actor} actor      The Actor
     * @param {ActorSheet} sheet The ActorSheet application
     * @param {object} data      The data that has been dropped onto the sheet
     */
    const allowed = Hooks.call("dropActorSheetData", actor, this as any, data);
    if (!allowed) {
      return;
    }

    // Handle different data types (document names)
    switch (data?.type) {
      case "ActiveEffect":
        return this._onDropActiveEffect(event, data as ActorSheet.DropData.ActiveEffect);
      case "Actor":
        return this._onDropActor(event, data as ActorSheet.DropData.Actor);
      case "Item":
        return this._onDropItem(event, data as ActorSheet.DropData.Item);
      case "JournalEntry":
        return this._onDropJournalEntry(event, data);
      case "JournalEntryPage":
        return this._onDropJournalEntryPage(event, data);
      case "Folder":
        return this._onDropFolder(event, data as ActorSheet.DropData.Folder);
      case "Compendium":
        return this._onDropCompendium(event, data);
      default:
        // This will warn about not supported Document Name
        isAllowedDocumentNames(data?.type, [
          "ActiveEffect",
          "Actor",
          "Item",
          "JournalEntry",
          "JournalEntryPage",
          "Folder",
        ]);
    }
  }

  override async _onDropItem(event: DragEvent, data: ActorSheet.DropData.Item): Promise<unknown> {
    // A player will not be able to copy an item to an Actor sheet
    // unless they are the owner.
    if (!this.actor.isOwner) {
      ui.notifications?.warn(
        localize("RQG.Actor.Notification.NotActorOwnerWarn", { actorName: this.actor.name }),
      );
      return false;
    }

    const { droppedDocument: item, isAllowedToDrop } =
      await extractDropInfo<foundry.abstract.Document.Any>(event, data);

    if (!isAllowedToDrop || !item) {
      return false;
    }

    const rqgItem = item as RqgItem;
    const itemData = rqgItem.toObject();
    // Handle item sorting within the same Actor
    if (this.actor.uuid === rqgItem.parent?.uuid) {
      return this._onSortItem(event, itemData) ?? false;
    }

    if (isDocumentSubType<OccupationItem>(rqgItem, ItemTypeEnum.Occupation)) {
      if (!hasRqid(rqgItem)) {
        return false;
      }
      await updateRqidLink(this.actor, "background.currentOccupationRqidLink", rqgItem);
      return [rqgItem];
    }

    if (!rqgItem.parent) {
      // Dropped from Sidebar
      // if (itemData.type === ItemTypeEnum.RuneMagic) {
      //   assertItemType(itemData.type, ItemTypeEnum.RuneMagic);
      //   itemData.data.cultId = ""; // clear cult id to avoid errors, player will have to associate this spell with a cult
      // }
      return this._onDropItemCreate(itemData);
    }

    const targetActor = this.actor;
    const sourceActor = rqgItem.parent;

    // Handle item sorting within the same Actor
    if (targetActor.uuid === sourceActor?.uuid) {
      return this._onSortItem(event, itemData) ?? false;
    }

    if (
      isDocumentSubType<ArmorItem>(itemData as any, ItemTypeEnum.Armor) ||
      isDocumentSubType<GearItem>(itemData as any, ItemTypeEnum.Gear) ||
      isDocumentSubType<WeaponItem>(itemData as any, ItemTypeEnum.Weapon)
    ) {
      // Prompt to confirm giving physical item from one Actor to another,
      // and ask how many if it has a quantity of more than one.
      return await this.confirmTransferPhysicalItem(itemData, sourceActor);
    } else {
      // Prompt to ensure user wants to copy intangible items
      //(runes, skills, passions, etc) from one Actor to another
      return await this.confirmCopyIntangibleItem(itemData, sourceActor);
    }
  }

  async _onDropJournalEntry(
    event: DragEvent,
    data: ActorSheet.DropData,
  ): Promise<boolean | JournalEntry[]> {
    const {
      droppedDocument: droppedJournal,
      dropZoneData: targetPropertyName,
      isAllowedToDrop,
    } = await extractDropInfo<JournalEntry>(event, data);

    if (isAllowedToDrop && hasRqid(droppedJournal)) {
      await updateRqidLink(this.actor, targetPropertyName, droppedJournal);
      return [droppedJournal];
    }
    return false;
  }

  async _onDropCompendium(event: DragEvent, data: ActorSheet.DropData): Promise<RqgItem[]> {
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
    return this._onDropItemCreate(documents.filter(isTruthy));
  }

  async _onDropJournalEntryPage(
    event: DragEvent,
    data: ActorSheet.DropData,
  ): Promise<boolean | JournalEntryPage[]> {
    const {
      droppedDocument: droppedPage,
      dropZoneData: targetPropertyName,
      isAllowedToDrop,
    } = await extractDropInfo<JournalEntryPage>(event, data);

    if (isAllowedToDrop && hasRqid(droppedPage)) {
      await updateRqidLink(this.actor, targetPropertyName, droppedPage);
      return [droppedPage];
    }
    return false;
  }

  private async confirmCopyIntangibleItem(
    incomingItemDataSource: Item.Implementation["_source"],
    sourceActor: RqgActor,
  ): Promise<RqgItem[] | boolean> {
    const adapter: any = {
      incomingItemDataSource: incomingItemDataSource,
      sourceActor: sourceActor,
      targetActor: this.actor,
    };
    const content: string = await foundry.applications.handlebars.renderTemplate(
      templatePaths.confirmCopyIntangibleItem,
      {
        adapter: adapter,
      },
    );

    const title = localize("RQG.Dialog.confirmCopyIntangibleItem.title", {
      itemName: incomingItemDataSource.name,
      targetActor: this.actor.name,
    });
    const confirmDialog = new RqgAsyncDialog<RqgItem[] | boolean>(title, content);

    const buttons = {
      submit: {
        icon: '<i class="fas fa-check"></i>',
        label: localize("RQG.Dialog.confirmCopyIntangibleItem.btnCopy"),
        callback: () => {
          confirmDialog.resolve(this.submitConfirmCopyIntangibleItem(incomingItemDataSource));
        },
      },
      cancel: {
        icon: '<i class="fas fa-times"></i>',
        label: localize("RQG.Dialog.Common.btnCancel"),
        callback: () => confirmDialog.resolve(false),
      },
    };
    return await confirmDialog.setButtons(buttons, "submit").show();
  }

  private async submitConfirmCopyIntangibleItem(
    incomingItemDataSource: Item.Implementation["_source"],
  ): Promise<RqgItem[]> {
    return this._onDropItemCreate(incomingItemDataSource);
  }

  private async confirmTransferPhysicalItem(
    incomingItemDataSource: Item.Implementation["_source"],
    sourceActor: RqgActor,
  ): Promise<RqgItem[] | boolean> {
    const adapter: any = {
      incomingItemDataSource: incomingItemDataSource,
      sourceActor: sourceActor,
      targetActor: this.actor,
      showQuantity: (incomingItemDataSource.system as any).quantity > 1,
    };

    const content: string = await foundry.applications.handlebars.renderTemplate(
      templatePaths.confirmTransferPhysicalItem,
      {
        adapter: adapter,
      },
    );

    const title = localize("RQG.Dialog.confirmTransferPhysicalItem.title", {
      itemName: incomingItemDataSource.name,
      targetActor: this.actor.name,
    });

    const confirmDialog = new RqgAsyncDialog<RqgItem[] | boolean>(title, content);

    const buttons = {
      submit: {
        icon: '<i class="fas fa-check"></i>',
        label: localize("RQG.Dialog.confirmTransferPhysicalItem.btnGive"),
        callback: async (html: JQuery | HTMLElement) =>
          confirmDialog.resolve(
            this.submitConfirmTransferPhysicalItem(
              html as JQuery,
              incomingItemDataSource,
              sourceActor,
            ),
          ),
      },
      cancel: {
        icon: '<i class="fas fa-times"></i>',
        label: localize("RQG.Dialog.Common.btnCancel"),
        callback: () => confirmDialog.resolve(false),
      },
    };
    return await confirmDialog.setButtons(buttons, "submit").show();
  }

  private async submitConfirmTransferPhysicalItem(
    html: JQuery,
    incomingItemDataSource: Item.Implementation["_source"],
    sourceActor: RqgActor,
  ): Promise<RqgItem[] | boolean> {
    const formData = new FormData(html.find("form")[0]);
    const data = Object.fromEntries(formData.entries());

    let quantityToTransfer: number = 1;
    if (data["numtotransfer"]) {
      quantityToTransfer = Number(data["numtotransfer"]);
    }
    return await this.transferPhysicalItem(incomingItemDataSource, quantityToTransfer, sourceActor);
  }

  private async transferPhysicalItem(
    incomingItemDataSource: Item.Implementation["_source"],
    quantityToTransfer: number,
    sourceActor: RqgActor,
  ): Promise<RqgItem[] | boolean> {
    if (!incomingItemDataSource || !incomingItemDataSource._id) {
      ui.notifications?.error(localize("RQG.Actor.Notification.NoIncomingItemDataSourceError"));
      return false;
    }
    if (!hasOwnProperty(incomingItemDataSource.system, "quantity")) {
      ui.notifications?.error(
        localize("RQG.Actor.Notification.IncomingItemDataSourceNotPhysicalItemError"),
      );
      return false;
    }
    if (quantityToTransfer < 1) {
      ui.notifications?.error(localize("RQG.Actor.Notification.CantTransferLessThanOneItemError"));
      return false;
    }
    if (quantityToTransfer > incomingItemDataSource.system.quantity) {
      ui.notifications?.error(
        localize("RQG.Actor.Notification.CantTransferMoreThanSourceOwnsError", {
          itemName: incomingItemDataSource.name,
          sourceActorName: sourceActor.name,
        }),
      );
      return false;
    }

    const existingItem = this.actor.items.find(
      (i) => i.name === incomingItemDataSource.name && i.type === incomingItemDataSource.type,
    ) as RqgItem | undefined;

    let newTargetQty = quantityToTransfer;
    const newSourceQty = Number(incomingItemDataSource.system.quantity) - quantityToTransfer;

    if (existingItem) {
      assertDocumentSubType<PhysicalItem>(
        existingItem,
        physicalItemTypes,
        "Existing item found when transferring physical item is not a PhysicalItem",
      );
      // Target actor has an item of this type with the same name

      newTargetQty += Number(existingItem.system.quantity);
      const targetUpdate = await this.actor.updateEmbeddedDocuments("Item", [
        { _id: existingItem.id, system: { quantity: newTargetQty } },
      ]);
      if (targetUpdate) {
        if (newSourceQty > 0) {
          // update with new source quantity
          return (await sourceActor.updateEmbeddedDocuments("Item", [
            { _id: incomingItemDataSource._id, system: { quantity: newSourceQty } },
          ])) as RqgItem[];
        } else {
          // delete source item
          await sourceActor.deleteEmbeddedDocuments("Item", [incomingItemDataSource._id]);
          return true;
        }
      }
    } else {
      // Target actor does not have an item of this type with the same name
      incomingItemDataSource.system.quantity = newTargetQty;
      const targetCreate = await this._onDropItemCreate(incomingItemDataSource);
      if (targetCreate) {
        if (newSourceQty > 0) {
          // update with new source quantity
          return (await sourceActor.updateEmbeddedDocuments("Item", [
            { _id: incomingItemDataSource._id, system: { quantity: newSourceQty } },
          ])) as RqgItem[];
        } else {
          // delete source item
          await sourceActor.deleteEmbeddedDocuments("Item", [incomingItemDataSource._id]);
          return true;
        }
      }
    }
    return false;
  }

  protected override async _renderOuter(): Promise<JQuery<HTMLElement>> {
    const html = await super._renderOuter();
    await addRqidLinkToSheetJQuery(html, this as any);

    const editModeLink = html.find(".title-edit-mode")[0];
    if (editModeLink) {
      editModeLink.dataset["tooltipDirection"] = "UP";
      editModeLink.dataset["tooltip"] = this.actor.system.editMode
        ? localize("RQG.Actor.EditMode.SwitchToPlayMode")
        : localize("RQG.Actor.EditMode.SwitchToEditMode");
    }

    return html;
  }

  protected override _getHeaderButtons(): Application.HeaderButton[] {
    const headerButtons = super._getHeaderButtons();

    if (
      game.settings?.get(systemId, "actor-wizard-feature-flag") && // TODO remove when wizard is released
      !this.actor.getFlag(systemId, actorWizardFlags)?.actorWizardComplete &&
      !this.actor.getFlag(systemId, actorWizardFlags)?.isActorTemplate
    ) {
      headerButtons.splice(0, 0, {
        class: `actor-wizard-button-${this.actor.id}`,
        label: localize("RQG.ActorCreation.AdventurerCreationHeaderButton"),
        icon: "fas fa-user-edit",
        onclick: () => this._openActorWizard(),
      });
    }

    const user = game.user;

    if (user?.isGM || user?.isTrusted) {
      if (this.actor.system.editMode) {
        headerButtons.splice(0, 0, {
          class: "title-edit-mode",
          label: "",
          icon: "edit-mode-icon",
          onclick: (event) => this._toggleEditMode(event),
        });
      } else {
        headerButtons.splice(0, 0, {
          class: "title-edit-mode",
          label: "",
          icon: "play-mode-icon",
          onclick: (event) => this._toggleEditMode(event),
        });
      }
    }

    return headerButtons;
  }

  _toggleEditMode(event: any) {
    const newMode = !this.actor.system.editMode;
    const link = getHTMLElement(event)?.closest("a");
    if (!link) {
      ui.notifications?.warn("No link element found when toggling editMode"); // Should never happen
      return;
    }

    if (newMode) {
      link.innerHTML = `<i class="edit-mode-icon"></i>`;
      link.dataset["tooltip"] = localize("RQG.Actor.EditMode.SwitchToPlayMode");
    } else {
      link.innerHTML = `<i class="play-mode-icon"></i>`;
      link.dataset["tooltip"] = localize("RQG.Actor.EditMode.SwitchToEditMode");
    }
    this.actor.update({ system: { editMode: newMode } });
  }

  _openActorWizard() {
    new ActorWizard(this.actor, {}).render(true);
  }

  private static async sortItems(actor: RqgActor, itemType: string): Promise<void> {
    const itemsToSort = actor.items.filter((i) => i.type === itemType) as RqgItem[];
    itemsToSort.sort((a, b) => {
      return (a.name ?? "").localeCompare(b.name ?? "");
    });

    itemsToSort.map((item, index) => {
      if (index === 0) {
        item.sort = CONST.SORT_INTEGER_DENSITY;
      } else {
        item.sort = (itemsToSort[index - 1]?.sort ?? 0) + CONST.SORT_INTEGER_DENSITY;
      }
    });
    const updateData = itemsToSort.map((item) => ({
      _id: item.id,
      sort: item.sort,
    }));
    await actor.updateEmbeddedDocuments("Item", updateData);
  }
}
