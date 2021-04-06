import { RqgActiveEffect } from "../actors/rqgActiveEffect";
import { RqgItem } from "./rqgItem";
import { logBug } from "../system/util";
import { RqgItemData } from "../data-model/item-data/itemTypes";

export class RqgItemSheet extends ItemSheet<RqgItemData> {
  //
  // import { RqgActor } from "../actors/rqgActor";
  // import { RqgItem } from "./rqgItem";
  //
  // // declare class ItemSheet<
  // //   D extends object = ActorSheet.Data<Actor>,
  // //   O extends Item = D extends ItemSheet.Data<infer T> ? T : Item,
  // //   P extends BaseEntitySheet.Options = BaseEntitySheet.Options
  // //   > extends BaseEntitySheet<P, D, O> {
  //
  // export class RqgItemSheet<
  //   D extends object = ActorSheet.Data<Actor<Actor.Data<RqgActor>>>,
  //   O extends Item = D extends ItemSheet.Data<infer T> ? T : Item,
  //   P extends BaseEntitySheet.Options = BaseEntitySheet.Options
  //   > extends ItemSheet<P, D, O> {

  get title(): string {
    return `${this.object.type}: ${this.object.name}`;
  }

  public activateListeners(html: JQuery): void {
    super.activateListeners(html);

    // Edit Item Active Effect
    (this.form as HTMLElement).querySelectorAll("[data-item-effect-edit]").forEach(async (el) => {
      const effectId = (el.closest("[data-effect-id]") as HTMLElement).dataset.effectId;
      const itemId = (el.closest("[data-item-id]") as HTMLElement).dataset.itemId;
      if (itemId && effectId) {
        const item = this.actor ? this.actor.getOwnedItem(itemId) : game.items?.get(itemId);
        el.addEventListener("click", () => {
          const effect = item?.effects.get(effectId) as RqgActiveEffect;
          if (effect) {
            new ActiveEffectConfig(effect).render(true);
          }
        });
      } else {
        logBug("Couldn't find item or effect id");
      }
    });

    // Add Item Active Effect
    (this.form as HTMLElement).querySelectorAll("[data-item-effect-add]").forEach(async (el) => {
      const itemId = (el.closest("[data-item-id]") as HTMLElement).dataset.itemId;
      if (itemId) {
        const item = this.actor
          ? this.actor.getOwnedItem(itemId)
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
          const e = await effect.create({});
          // @ts-ignore TODO remove
          new ActiveEffectConfig(item.effects.get(e._id)).render(true);
        });
      } else {
        logBug("Couldn't find item", itemId);
      }
    });

    // Delete Item Active Effect
    (this.form as HTMLElement).querySelectorAll("[data-item-effect-delete]").forEach(async (el) => {
      const effectId = (el.closest("[data-effect-id]") as HTMLElement).dataset.effectId;
      const itemId = (el.closest("[data-item-id]") as HTMLElement).dataset.itemId as string;

      if (effectId && itemId) {
        // const actor = await fromUuid(item.getFlag("core", "sourceId"));
        // const item = actor ? this.actor.getOwnedItem(itemId) : game.items.get(itemId);
        el.addEventListener("click", () => {
          const item = this.actor ? this.actor.getOwnedItem(itemId) : game.items?.get(itemId);
          if (item) {
            item.delete();
          } else {
            logBug("Couldn't find item");
          }
        });
      } else {
        logBug("Couldn't fins effect or item id");
      }
    });
  }
}
