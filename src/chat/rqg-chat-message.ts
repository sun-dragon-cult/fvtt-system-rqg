import {
  handleApplyActorDamage,
  handleApplyWeaponDamage,
  handleDefence,
  handleRollDamageAndHitLocation,
  handleRollFumble,
} from "./attack-flow-handlers";
import {
  handleAcceptResistanceRequest,
  handleRollResistanceRequest,
} from "./resistance-request-handlers";
import { AbilityRoll } from "../rolls/ability-roll/ability-roll";
import { isFoundryElementInstanceOf, localize, safeFromJSON } from "../system/util";
import { DamageRoll } from "../rolls/damage-roll/damage-roll";
import { HitLocationRoll } from "../rolls/hit-location-roll/hit-location-roll";
import { ResistanceRoll } from "../rolls/resistance-roll/resistance-roll";

import Roll = foundry.dice.Roll;

import { templatePaths } from "../system/load-handlebars-templates";
import { CombatChatMessageData } from "./data-model/combat-chat-message.data-model.ts";
import type { CombatDataProperties } from "./data-model/combat-chat-message.types.ts";
import { ResistanceRequestChatMessageData } from "./data-model/resistance-request-chat-message.data-model.ts";
import type { ResistanceRequestDataProperties } from "./data-model/resistance-request-chat-message.types.ts";

// TODO how to type this so combat subtype data is typed?
export class RqgChatMessage extends ChatMessage {
  public static init() {
    CONFIG.ChatMessage.documentClass = RqgChatMessage;
    CONFIG.ChatMessage.template = templatePaths.chatMessage;

    CONFIG.ChatMessage.dataModels["combat"] = CombatChatMessageData;
    CONFIG.ChatMessage.dataModels["resistanceRequest"] = ResistanceRequestChatMessageData;

    Hooks.on("ready", () => {
      // one listener for sidebar chat, popped out chat & chat notification
      document.addEventListener("click", RqgChatMessage.clickHandler);
    });
  }

  override _onUpdate(
    data: ChatMessage.UpdateData,
    options: ChatMessage.Database.OnUpdateOptions,
    userId: string,
  ) {
    if ((ui?.chat as any)?.isAtBottom) {
      // TODO how to make it work without releasing the execution thread?
      setTimeout(() => ui?.chat?.scrollBottom(), 0);
    }

    super._onUpdate(data, options, userId);
  }

  /** @inheritDoc */
  override async renderHTML(options?: ChatMessage.RenderHTMLOptions): Promise<HTMLElement> {
    const element = await super.renderHTML(options);
    await this.#enrichChatCard(element);
    return element;
  }

  public static async clickHandler(clickEvent: MouseEvent): Promise<void> {
    if (clickEvent.defaultPrevented) {
      return;
    }

    const target = clickEvent.target;
    if (!isFoundryElementInstanceOf(target, Element)) {
      return;
    }

    const clickedButton = target.closest("button");
    if (!isFoundryElementInstanceOf(clickedButton, HTMLButtonElement)) {
      return;
    }
    // ***************************
    // *** START - Attack Flow ***
    // ***************************

    if (clickedButton?.dataset["defence"] != null) {
      RqgChatMessage.commonClickHandling(clickEvent, clickedButton);
      await handleDefence(clickedButton); // Open Defence Dialog (roll defence)
    }

    if (clickedButton?.dataset["rollDamageAndHitlocation"] != null) {
      RqgChatMessage.commonClickHandling(clickEvent, clickedButton);
      await handleRollDamageAndHitLocation(clickedButton); // Roll damage & hit location
    }

    if (clickedButton?.dataset["applyDamageToActor"] != null) {
      RqgChatMessage.commonClickHandling(clickEvent, clickedButton);
      await handleApplyActorDamage(clickedButton); // Inflict damage to actor
    }

    if (clickedButton?.dataset["applyDamageToWeapon"] != null) {
      RqgChatMessage.commonClickHandling(clickEvent, clickedButton);
      await handleApplyWeaponDamage(clickedButton); // Damage weapon HP
    }

    if (clickedButton?.dataset["fumble"] != null) {
      RqgChatMessage.commonClickHandling(clickEvent, clickedButton);
      await handleRollFumble(clickedButton); // Roll the Fumble table
    }

    // *************************
    // *** END - Attack Flow ***
    // *************************

    if (clickedButton?.dataset["rollResistanceRequest"] != null) {
      RqgChatMessage.commonClickHandling(clickEvent, clickedButton);
      await handleRollResistanceRequest(clickedButton);
    }

    if (clickedButton?.dataset["acceptResistanceRequest"] != null) {
      RqgChatMessage.commonClickHandling(clickEvent, clickedButton);
      await handleAcceptResistanceRequest(clickedButton);
    }
  }

  private static commonClickHandling(clickEvent: MouseEvent, clickedButton: HTMLButtonElement) {
    clickEvent.preventDefault();
    clickEvent.stopPropagation();
    clickedButton.disabled = true;
    setTimeout(() => (clickedButton.disabled = false), 1000); // Prevent double clicks
  }

  /**
   * Augment the chat card html markup for additional styling and eventlisteners.
   */
  async #enrichChatCard(html: HTMLElement): Promise<void> {
    // Bind action handlers on each rendered card so chat popouts/detached windows work too.
    html.addEventListener("click", RqgChatMessage.clickHandler);

    // Enrich the combat chat message with evaluated rolls. They target disjoint slots, so the
    // renders can overlap. Roll.fromData redirects to the serialized class, which is how the
    // spell cast slot resolves to whichever magic roll produced it.
    await Promise.all([
      this.#enrichHtmlWithRoll(html, "attackRoll", "[data-attack-roll-html]"),
      this.#enrichHtmlWithRoll(html, "defenceRoll", "[data-defence-roll-html]"),
      this.#enrichHtmlWithRoll(html, "damageRoll", "[data-damage-roll-html]"),
      this.#enrichHtmlWithRoll(html, "hitLocationRoll", "[data-hit-location-roll-html]"),
      this.#enrichHtmlWithRoll(
        html,
        "resistanceRoll",
        "[data-resistance-roll-html]",
        ResistanceRoll,
      ),
      this.#enrichHtmlWithRoll(html, "castRoll", "[data-cast-roll-html]", Roll),
    ]);

    this.#hideHtmlElementsByOwnership(html);

    // Add event listener for Dice Rolls
    [...html.querySelectorAll<HTMLElement>(".dice-roll")].forEach((el) =>
      el.addEventListener("click", this._onClickDiceRoll.bind(this)),
    );
  }

  /**
   * Handle dice roll expansion to show "specification".
   * @protected
   */
  _onClickDiceRoll(event: MouseEvent) {
    event.stopPropagation();

    const target = event.currentTarget;
    if (!isFoundryElementInstanceOf(target, HTMLElement)) {
      return;
    }
    target?.classList.toggle("expanded");
  }

  /**
   * Optionally hide the display of chat html elements which should not be shown to user.
   * The data-only-owner-visible-uuid value should be a document uuid that can be checked for ownership.
   * data-hide-from-owner-uuid is its inverse - everyone *but* that document's owners sees it, for
   * the rarer case of keeping one participant in the dark rather than the rest of the table. It
   * pairs with data-hide-unless-owner-uuid, which exempts one document's owners from that hiding
   * and does nothing on its own. Both are a courtesy screen, not a secret: the markup still reaches
   * the client, so never hide anything there that a player must not be able to read.
   */
  #hideHtmlElementsByOwnership(html: HTMLElement | undefined): void {
    if (game.user?.isGM) {
      return; // Do not hide anything from GM
    }

    // Otherwise conceal elements for unrelated actors/players
    const maybeHideElements = html?.querySelectorAll("[data-only-owner-visible-uuid]");

    maybeHideElements?.forEach((el: Element) => {
      if (!(el instanceof HTMLElement)) {
        return;
      }
      const document = fromUuidSync(el.dataset["onlyOwnerVisibleUuid"]);
      if (el.dataset["onlyOwnerVisibleUuid"] && !(document as any)?.isOwner) {
        el.classList.add("dont-display");
      }
    });

    html?.querySelectorAll("[data-hide-from-owner-uuid]").forEach((el: Element) => {
      if (!(el instanceof HTMLElement)) {
        return;
      }
      const uuid = el.dataset["hideFromOwnerUuid"];
      if (!uuid || !(fromUuidSync(uuid) as any)?.isOwner) {
        return;
      }
      // Owning the exempt document wins - you never lose sight of your own side of an exchange.
      const exemptUuid = el.dataset["hideUnlessOwnerUuid"];
      if (exemptUuid && (fromUuidSync(exemptUuid) as any)?.isOwner) {
        return;
      }
      el.classList.add("dont-display");
    });
  }

  async #enrichHtmlWithRoll(
    html: HTMLElement,
    systemDataRollName: string,
    domSelector: string,
    RollClass: any = AbilityRoll,
  ): Promise<void> {
    const rollJson = (this.system as any)[systemDataRollName];
    const roll = safeFromJSON<AbilityRoll | ResistanceRoll>(RollClass, rollJson);
    if (roll?.isEvaluated) {
      const element = html.querySelector<HTMLElement>(domSelector);
      if (element) {
        // A blind roll's result is obscured for everyone but the GM.
        const isPrivate = !!this.blind && !game.user?.isGM;
        element.innerHTML = await roll.render({ isPrivate });
      }
    }
  }

  /**
   * Export the content of the chat message into a standardized log format
   */
  override export(): string {
    let content: string[] = [];

    // Handle HTML content
    if (this.content) {
      const article = document.createElement("article");
      article.innerHTML = this.content.replace(/<\/div>/g, "</div>|n");
      const text = article.textContent ?? this.content;
      const lines = text
        .replace(/\n/g, "")
        .split("  ")
        .filter((p: string) => p !== "")
        .join(" ");
      content = lines.split("|n").map((l: string) => l.trim());
    }

    // Add Roll content
    for (const roll of this.rolls) {
      if (roll instanceof AbilityRoll) {
        content.push(
          `AbilityRoll: ${roll.flavor
            .replaceAll(/<[^>]*>/gm, "")
            .replaceAll(/\n */gm, " ")
            .trim()} ${roll.total} / ${roll.targetChance} = ${localize(`RQG.Game.AbilityResultEnum.${roll.successLevel}`)} `,
        );
      } else if (roll instanceof DamageRoll) {
        content.push(`DamageRoll: ${roll.formula} = ${roll.result} = ${roll.total}`);
      } else {
        content.push(`${roll.formula} = ${roll.result} = ${roll.total}`);
      }
    }

    if (this.isCombatMessage()) {
      const defenceRoll = safeFromJSON<AbilityRoll>(AbilityRoll, this.system.defenceRoll);
      if (defenceRoll?.isEvaluated) {
        content.unshift(
          `DefenceRoll: ${defenceRoll.total} / ${defenceRoll.targetChance} = ${localize(`RQG.Game.AbilityResultEnum.${defenceRoll.successLevel}`)}`,
        );
      }

      const attackRoll = safeFromJSON<AbilityRoll>(AbilityRoll, this.system.attackRoll);
      if (attackRoll?.isEvaluated) {
        content.unshift(
          `AttackRoll: ${attackRoll.total} / ${attackRoll.targetChance} = ${localize(`RQG.Game.AbilityResultEnum.${attackRoll.successLevel}`)}`,
        );
        content.unshift(this.flavor.replaceAll(/\n|<[^>]*>/gm, "")); // Make sure the target of the attack also is exported
      }

      const damageRoll = safeFromJSON<DamageRoll>(DamageRoll, this.system.damageRoll);
      if (damageRoll?.isEvaluated) {
        content.push(
          `DamageRoll: ${damageRoll.originalFormula} = ${damageRoll.result} = ${damageRoll.total}`,
        );
      }

      const hitLocationRoll = safeFromJSON<HitLocationRoll>(
        HitLocationRoll,
        this.system.hitLocationRoll,
      );
      if (hitLocationRoll?.isEvaluated) {
        content.push(
          `HitLocationRoll: ${hitLocationRoll.formula} = ${hitLocationRoll.total} = ${hitLocationRoll.hitLocationName}`,
        );
      }
    } else if (this.isResistanceRequestMessage()) {
      const resistanceRoll = safeFromJSON<ResistanceRoll>(
        ResistanceRoll,
        this.system.resistanceRoll,
      );
      if (resistanceRoll?.isEvaluated) {
        content.push(
          `ResistanceRoll: ${resistanceRoll.total} / ${resistanceRoll.targetChance} = ${localize(`RQG.Game.AbilityResultEnum.${resistanceRoll.successLevel}`)}`,
        );
      }
    }

    // Author and timestamp TODO users locale (don't have that), or maybe Gloranthan time formatting?
    const time = new Date(this.timestamp).toLocaleDateString("en-US", {
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    });

    // Format logged result
    return `[${time}] ${this.alias}\n${content.filterJoin("\n")}`;
  }

  isCombatMessage(): this is CombatDataProperties {
    return this.type === "combat";
  }

  isResistanceRequestMessage(): this is ResistanceRequestDataProperties {
    return this.type === "resistanceRequest";
  }
}
