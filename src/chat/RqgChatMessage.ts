import {
  handleApplyActorDamage,
  handleApplyWeaponDamage,
  handleDefence,
  handleRollDamageAndHitLocation,
  handleRollFumble,
} from "./attackFlowHandlers";
import { AbilityRoll } from "../rolls/AbilityRoll/AbilityRoll";
import { localize } from "../system/util";
import { DamageRoll } from "../rolls/DamageRoll/DamageRoll";
import { HitLocationRoll } from "../rolls/HitLocationRoll/HitLocationRoll";

import { templatePaths } from "../system/loadHandlebarsTemplates";
import { CombatChatMessageData } from "../data-model/chat-data/combatChatMessage.dataModel.ts";

// TODO how to type this so combat subtype data is typed?
export class RqgChatMessage<
  SubType extends ChatMessage.SubType = ChatMessage.SubType,
> extends ChatMessage<SubType> {
  public static init() {
    CONFIG.ChatMessage.documentClass = RqgChatMessage;
    CONFIG.ChatMessage.template = templatePaths.chatMessage;

    CONFIG.ChatMessage.dataModels.combat = CombatChatMessageData;

    Hooks.on("ready", () => {
      // one listener for sidebar chat, popped out chat & chat notification
      document.addEventListener("click", RqgChatMessage.clickHandler);
    });
  }

  override _onUpdate(data: any, options: any, userId: string) {
    if ((ui?.chat as any)?.isAtBottom) {
      // TODO how to make it work without releasing the execution thread?
      // @ts-expect-error scrollBottom
      setTimeout(() => ui?.chat?.scrollBottom(), 0);
    }

    super._onUpdate(data, options, userId);
  }

  /** @inheritDoc */
  override async renderHTML(...args: any[]): Promise<HTMLElement> {
    const element = await super.renderHTML(...args);
    await this.#enrichChatCard(element);
    return element;
  }

  public static async clickHandler(clickEvent: MouseEvent): Promise<void> {
    const clickedButton = clickEvent.target as HTMLButtonElement;
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
  }

  private static commonClickHandling(clickEvent: MouseEvent, clickedButton: HTMLButtonElement) {
    clickEvent.preventDefault();
    clickedButton.disabled = true;
    setTimeout(() => (clickedButton.disabled = false), 1000); // Prevent double clicks
  }

  /**
   * Augment the chat card html markup for additional styling and eventlisteners.
   */
  async #enrichChatCard(html: HTMLElement): Promise<void> {
    // Enrich the combat chat message with evaluated rolls
    await this.#enrichHtmlWithRoll(html, "attackRoll", "[data-attack-roll-html]");
    await this.#enrichHtmlWithRoll(html, "defenceRoll", "[data-defence-roll-html]");
    await this.#enrichHtmlWithRoll(html, "damageRoll", "[data-damage-roll-html]");
    await this.#enrichHtmlWithRoll(html, "hitLocationRoll", "[data-hit-location-roll-html]");

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
    if (!(target instanceof HTMLElement)) {
      return;
    }
    target?.classList.toggle("expanded");
  }

  /**
   * Optionally hide the display of chat html elements which should not be shown to user.
   * The data-only-owner-visible-uuid value should be a document uuid that can be checked for ownership.
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
  }

  async #enrichHtmlWithRoll(
    html: HTMLElement,
    systemDataProp: string,
    domSelector: string,
  ): Promise<void> {
    const rollData = (this.system as any)[systemDataProp];
    if (rollData?.evaluated) {
      const roll = AbilityRoll.fromData(rollData);
      const element = html.querySelector<HTMLElement>(domSelector);
      if (element) {
        element.innerHTML = await roll.render();
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
      const html = $("<article>").html(this.content.replace(/<\/div>/g, "</div>|n"));
      const text = html.length ? html.text() : this.content;
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

    if (this.type === "combat") {
      const defenceRollData = this.system.defenceRoll;
      const defenceRoll = defenceRollData ? AbilityRoll.fromData(defenceRollData) : undefined;
      if (defenceRoll?.total) {
        content.unshift(
          `DefenceRoll: ${defenceRoll.total} / ${defenceRoll.targetChance} = ${localize(`RQG.Game.AbilityResultEnum.${defenceRoll.successLevel}`)}`,
        );
      }

      const attackRollData = this.system.attackRoll;
      const attackRoll = attackRollData ? AbilityRoll.fromData(attackRollData) : undefined;
      if (attackRoll?.total) {
        content.unshift(
          `AttackRoll: ${attackRoll.total} / ${attackRoll.targetChance} = ${localize(`RQG.Game.AbilityResultEnum.${attackRoll.successLevel}`)}`,
        );
        content.unshift(this.flavor.replaceAll(/\n|<[^>]*>/gm, "")); // Make sure the target of the attack also is exported
      }

      const damageRollData = this.system.damageRoll;
      const damageRoll = damageRollData ? DamageRoll.fromData(damageRollData) : undefined;
      if (damageRoll?.total) {
        content.push(
          `DamageRoll: ${damageRoll.originalFormula} = ${damageRoll.result} = ${damageRoll.total}`,
        );
      }

      const hitLocationRollData = this.system.hitLocationRoll;
      const hitLocationRoll = hitLocationRollData
        ? HitLocationRoll.fromData(hitLocationRollData)
        : undefined;
      if (hitLocationRoll?.total) {
        content.push(
          `HitLocationRoll: ${hitLocationRoll.formula} = ${hitLocationRoll.total} = ${hitLocationRoll.hitLocationName}`,
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
}
