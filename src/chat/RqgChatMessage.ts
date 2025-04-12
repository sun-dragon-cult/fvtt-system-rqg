import {
  handleApplyActorDamage,
  handleApplyWeaponDamage,
  handleDefence,
  handleRollDamageAndHitLocation,
  handleRollFumble,
} from "./attackFlowHandlers";
import { AbilityRoll } from "../rolls/AbilityRoll/AbilityRoll";
import { getGameUser, localize } from "../system/util";
import { DamageRoll } from "../rolls/DamageRoll/DamageRoll";
import { HitLocationRoll } from "../rolls/HitLocationRoll/HitLocationRoll";
import { CombatChatMessageData } from "../data-model/chat-data/combatChatMessage.dataModel";

export class RqgChatMessage extends ChatMessage {
  declare system: any; // TODO type workaround, should be the type of RqgChatMessageData

  public static init() {
    CONFIG.ChatMessage.documentClass = RqgChatMessage;
    // @ts-expect-error dataModels
    CONFIG.ChatMessage.dataModels.combat = CombatChatMessageData;

    Hooks.on("renderChatLog", (chatLog: any, html: JQuery) => {
      RqgChatMessage.addChatListeners(html[0]);
    });
  }

  _onUpdate(data: any, options: any, userId: string) {
    // @ts-expect-error isAtBottom
    if (ui?.chat?.isAtBottom) {
      // TODO how to make it work without releasing the execution thread?
      // @ts-expect-error scrollBottom
      setTimeout(() => ui?.chat.scrollBottom(), 0);
    }

    super._onUpdate(data, options, userId);
  }

  /** @inheritDoc */
  async getHTML(): Promise<JQuery> {
    const html = await super.getHTML();
    const element = html instanceof HTMLElement ? html : html[0];
    await this.#enrichChatCard(element);
    return $(element);
  }

  private static addChatListeners(html: HTMLElement | undefined): void {
    html?.addEventListener("click", RqgChatMessage.clickHandler);
  }

  public static async clickHandler(clickEvent: MouseEvent): Promise<void> {
    const clickedButton = clickEvent.target as HTMLButtonElement;
    // ***************************
    // *** START - Attack Flow ***
    // ***************************

    if (clickedButton?.dataset.defence != null) {
      RqgChatMessage.commonClickHandling(clickEvent, clickedButton);
      await handleDefence(clickedButton); // Open Defence Dialog (roll defence)
    }

    if (clickedButton?.dataset.rollDamageAndHitlocation != null) {
      RqgChatMessage.commonClickHandling(clickEvent, clickedButton);
      await handleRollDamageAndHitLocation(clickedButton); // Roll damage & hit location
    }

    if (clickedButton?.dataset.applyDamageToActor != null) {
      RqgChatMessage.commonClickHandling(clickEvent, clickedButton);
      await handleApplyActorDamage(clickedButton); // Inflict damage to actor
    }

    if (clickedButton?.dataset.applyDamageToWeapon != null) {
      RqgChatMessage.commonClickHandling(clickEvent, clickedButton);
      await handleApplyWeaponDamage(clickedButton); // Damage weapon HP
    }

    if (clickedButton?.dataset.fumble != null) {
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
    // Add event listener for Dice Rolls
    [...html.querySelectorAll<HTMLElement>(".dice-roll")].forEach((el) =>
      el.addEventListener("click", this._onClickDiceRoll.bind(this)),
    );

    // Enrich the combat chat message with evaluated rolls
    await this.#enrichHtmlWithRoll(html, "attackRoll", "[data-attack-roll-html]");
    await this.#enrichHtmlWithRoll(html, "defenceRoll", "[data-defence-roll-html]");
    await this.#enrichHtmlWithRoll(html, "damageRoll", "[data-damage-roll-html]");
    await this.#enrichHtmlWithRoll(html, "hitLocationRoll", "[data-hit-location-roll-html]");

    this.#hideHtmlElementsByOwnership(html);
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
    if (getGameUser().isGM) {
      return; // Do not hide anything from GM
    }

    // Otherwise conceal elements for unrelated actors/players
    const maybeHideElements = html?.querySelectorAll("[data-only-owner-visible-uuid]");

    maybeHideElements?.forEach((el: Element) => {
      if (!(el instanceof HTMLElement)) {
        return;
      }
      // @ts-expect-error fromUuidSync
      const document = fromUuidSync(el.dataset.onlyOwnerVisibleUuid);
      if (el.dataset.onlyOwnerVisibleUuid && !document?.isOwner) {
        el.classList.add("dont-display");
      }
    });
  }

  async #enrichHtmlWithRoll(
    html: HTMLElement,
    systemDataProp: string,
    domSelector: string,
  ): Promise<void> {
    const rollData = this.system[systemDataProp];
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
  export(): string {
    let content = [];

    // Handle HTML content
    // @ts-expect-error content
    if (this.content) {
      // @ts-expect-error content
      const html = $("<article>").html(this.content.replace(/<\/div>/g, "</div>|n"));
      // @ts-expect-error content
      const text = html.length ? html.text() : this.content;
      const lines = text
        .replace(/\n/g, "")
        .split("  ")
        .filter((p: string) => p !== "")
        .join(" ");
      content = lines.split("|n").map((l: string) => l.trim());
    }

    // Add Roll content
    // @ts-expect-error rolls
    for (const roll of this.rolls) {
      if (hasProperty(roll, "successLevel")) {
        content.push(
          `AbilityRoll: ${roll.flavor
            .replaceAll(/<[^>]*>/gm, "")
            .replaceAll(/\n */gm, " ")
            .trim()} ${roll.total} / ${roll.targetChance} = ${localize(`RQG.Game.AbilityResultEnum.${roll.successLevel}`)} `,
        );
      } else {
        content.push(`${roll.formula} = ${roll.result} = ${roll.total}`);
      }
    }

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
      // @ts-expect-error content
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

    // Author and timestamp
    // @ts-expect-error timestamp
    const time = new Date(this.timestamp).toLocaleDateString("en-US", {
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    });

    // Format logged result
    return `[${time}] ${this.alias}\n${content.filterJoin("\n")}`;
  }
}
