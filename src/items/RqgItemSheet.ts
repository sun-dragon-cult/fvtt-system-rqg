import { RqgActiveEffect } from "../actors/rqgActiveEffect";
import { RqgItem } from "./rqgItem";
import { RqgItemData } from "../data-model/item-data/itemTypes";
import { capitalize, getRequiredDomDataset } from "../system/util";

export class RqgItemSheet extends ItemSheet<RqgItemData> {
  get title(): string {
    return `${game.i18n.format("ITEM.Type" + capitalize(this.object.type))}: ${this.object.name}`;
  }

  public activateListeners(html: JQuery): void {
    super.activateListeners(html);

    // Edit Item Active Effect
    $(this.form!)
      .find("[data-item-effect-edit]")
      .each((i: number, el: HTMLElement) => {
        const effectId = getRequiredDomDataset($(el), "effect-id");
        const itemId = getRequiredDomDataset($(el), "item-id");
        const item = game.items?.get(itemId);
        if (!item) {
          return; // The item is not in the world (ie it's in a compendium)
        }
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
        const item = game.items?.get(itemId) as RqgItem;
        if (!item) {
          return; // The item is not in the world (ie it's in a compendium)
        }
        el.addEventListener("click", async () => {
          const effect = new ActiveEffect(
            {
              icon: "icons/svg/aura.svg",
              changes: [],
              label: "New Active Effect",
              transfer: true,
              disabled: false,
            },
            item
          );

          const e = await item
            // @ts-ignore 0.8
            .createEmbeddedDocuments("ActiveEffect", [effect.toObject()])
            .catch((reason: any) => {
              ui.notifications?.error("Couldn't create Active Effect");
              throw reason;
            });
          new ActiveEffectConfig(item.effects.get(e[0].id)!).render(true);
        });
      });

    // Delete Item Active Effect
    $(this.form!)
      .find("[data-item-effect-delete]")
      .each((i: number, el: HTMLElement) => {
        const itemId = getRequiredDomDataset($(el), "item-id");
        const effectId = getRequiredDomDataset($(el), "effect-id");
        el.addEventListener("click", () => {
          const item = game.items?.get(itemId);
          if (!item) {
            return; // The item is not in the world (ie it's in a compendium)
          }
          // @ts-ignore 0.8
          item.getEmbeddedDocument("ActiveEffect", effectId).delete();
        });
      });
  }
}
