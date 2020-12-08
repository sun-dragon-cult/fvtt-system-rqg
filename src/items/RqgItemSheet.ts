export class RqgItemSheet<DataType = any, ItemType extends Item<DataType> = any> extends ItemSheet<
  DataType,
  ItemType
> {
  get title() {
    return this.object.permission ? `${this.object.type}: ${this.object.name}` : "";
  }

  protected activateListeners(html: JQuery) {
    super.activateListeners(html);

    // Edit Item Active Effect
    this.form.querySelectorAll("[data-item-effect-edit]").forEach(async (el) => {
      const effectId = (el.closest("[data-effect-id]") as HTMLElement).dataset.effectId;
      const itemId = (el.closest("[data-item-id]") as HTMLElement).dataset.itemId;
      const item = this.actor ? this.actor.getOwnedItem(itemId) : game.items.get(itemId);

      el.addEventListener("click", () =>
        // @ts-ignore
        new ActiveEffectConfig(item.effects.get(effectId)).render(true)
      );
    });

    // Add Item Active Effect
    this.form.querySelectorAll("[data-item-effect-add]").forEach(async (el) => {
      const itemId = (el.closest("[data-item-id]") as HTMLElement).dataset.itemId;

      const item = this.actor ? this.actor.getOwnedItem(itemId) : game.items.get(itemId);

      const effect = await ActiveEffect.create(
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
        // @ts-ignore
        new ActiveEffectConfig(item.effects.get(e._id)).render(true);
      });
    });

    // Delete Item Active Effect
    this.form.querySelectorAll("[data-item-effect-delete]").forEach(async (el) => {
      const effectId = (el.closest("[data-effect-id]") as HTMLElement).dataset.effectId;
      const itemId = (el.closest("[data-item-id]") as HTMLElement).dataset.itemId;

      const item = this.actor ? this.actor.getOwnedItem(itemId) : game.items.get(itemId);

      // const actor = await fromUuid(item.getFlag("core", "sourceId"));
      // const item = actor ? this.actor.getOwnedItem(itemId) : game.items.get(itemId);

      // @ts-ignore
      el.addEventListener("click", () => item.effects.get(effectId).delete());
    });
  }
}
