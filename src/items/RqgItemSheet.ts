import { RqgActiveEffect } from "../actors/rqgActiveEffect";
import { RqgItem } from "./rqgItem";
import { RqgItemData } from "../data-model/item-data/itemTypes";
import { getRequiredDomDataset, RqgError } from "../system/util";

export class RqgItemSheet extends ItemSheet<RqgItemData> {
  get title(): string {
    return `${this.object.type}: ${this.object.name}`;
  }

  public activateListeners(html: JQuery): void {
    super.activateListeners(html);

    // Edit Item Active Effect
    $(this.form!)
      .find("[data-item-effect-edit]")
      .each((i: number, el: HTMLElement) => {
        const effectId = getRequiredDomDataset($(el), "effect-id");
        const itemId = getRequiredDomDataset($(el), "item-id");
        const item = this.actor ? this.actor.getOwnedItem(itemId) : game.items?.get(itemId);
        el.addEventListener("click", () => {
          const effect = item?.effects.get(effectId) as RqgActiveEffect;
          if (effect) {
            new ActiveEffectConfig(effect).render(true);
          }
        });
      });

    // Add Item Active Effect
    $(this.form!)
      .find("[data-item-effect-add]")
      .each((i: number, el: HTMLElement) => {
        const itemId = getRequiredDomDataset($(el), "item-id");
        const item = this.actor
          ? this.actor.getOwnedItem(itemId) // TODO prevent this instead?
          : (game.items?.get(itemId) as RqgItem);
        const effect = ActiveEffect.create(
          {
            icon: "icons/svg/aura.svg",
            changes: [],
            label: "New Active Effect",
            transfer: true,
            disabled: false,
          },
          item
        );

        el.addEventListener("click", async () => {
          const e = await effect.create({}).catch((reason) => {
            ui.notifications?.error("Couldn't create Active Effect");
            throw reason;
          });
          new ActiveEffectConfig(item.effects.get(e._id)!).render(true);
        });
      });

    // Delete Item Active Effect
    $(this.form!)
      .find("[data-item-effect-delete]")
      .each((i: number, el: HTMLElement) => {
        const itemId = getRequiredDomDataset($(el), "item-id");
        const effectId = getRequiredDomDataset($(el), "effect-id");
        el.addEventListener("click", () => {
          const item = this.actor ? this.actor.getOwnedItem(itemId) : game.items?.get(itemId);
          if (!item) {
            const msg = "Couldn't find item";
            ui.notifications?.error(msg);
            throw new RqgError(msg);
          }
          item.getEmbeddedEntity("ActiveEffect", effectId).delete();
        });
      });
  }
}
