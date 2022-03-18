import { getDefaultRqid, getDomDataset, getGame, getRequiredDomDataset, localize, localizeItemType } from "../system/util";
import { RqgItem } from "./rqgItem";

export interface RqgItemSheetData {
  isGM: boolean;
  ownerId: string | null | undefined;
  uuid: string | undefined;
  supportedLanguages: {
    en: string;
  } & Partial<Record<string, string>>;
}

export class RqgItemSheet<
  Options extends ItemSheet.Options,
  Data extends object = ItemSheet.Data<Options>
> extends ItemSheet<Options, Data> {
  get title(): string {
    return `${localizeItemType(this.object.type)}: ${this.object.name}`;
  }

  public activateListeners(html: JQuery): void {
    super.activateListeners(html);

    // Edit Item Active Effect
    $(this.form!)
      .find("[data-item-effect-edit]")
      .each((i: number, el: HTMLElement) => {
        const effectId = getRequiredDomDataset($(el), "effect-id");
        const itemId = getRequiredDomDataset($(el), "item-id");
        const item = getGame().items?.get(itemId);
        if (!item) {
          return; // The item is not in the world (ie it's in a compendium)
        }
        el.addEventListener("click", () => {
          const effect = item?.effects.get(effectId);
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
        const item = getGame().items?.get(itemId);
        if (!item) {
          return; // The item is not in the world (ie it's in a compendium)
        }
        el.addEventListener("click", async () => {
          const effect = new ActiveEffect(
            {
              icon: "icons/svg/aura.svg",
              changes: [],
              label: localize("RQG.Foundry.ActiveEffect.NewActiveEffectName"),
              transfer: true,
              disabled: false,
            },
            item as any // TODO Type bailout - fixme!
          );

          const e = await item
            .createEmbeddedDocuments("ActiveEffect", [effect.toObject()])
            .catch((reason: any) => {
              ui.notifications?.error(
                localize("RQG.Item.Notification.CantCreateActiveEffect", {
                  itemType: localizeItemType(item.data.type),
                })
              );
              throw reason;
            });
          e[0].id && new ActiveEffectConfig(item.effects.get(e[0].id)!).render(true);
        });
      });

    // Delete Item Active Effect
    this.form?.querySelectorAll<HTMLElement>("[data-item-effect-delete]").forEach((el) => {
      const effectId = getRequiredDomDataset(el, "effect-id");
      el.addEventListener("click", () => {
        this.item.getEmbeddedDocument("ActiveEffect", effectId)?.delete();
      });
    });

    // RQG System Tab

    // Create a quick rqid based on the item
    $(this.form!)
      .find("[data-item-rqid-quick]")
      .each((i: number, el: HTMLElement) => {
        const itemId = getRequiredDomDataset($(el), "item-id");
        const ownerId = getDomDataset($(el), "owner-id") // may or may not be there
        el.addEventListener("click", async () => {
          let item: RqgItem | undefined = undefined;
          if (ownerId) {
            // Get the item from the owner
            item = getGame().actors?.get(ownerId)?.items.get(itemId);
          } else {
            // Get the item from the world
            item = getGame().items?.get(itemId) as RqgItem;
          }
          if (!item) {
            return;
          }
            const newRqid = getDefaultRqid(item);

            if (ownerId) {
              const actor = getGame().actors?.get(ownerId);
              if (actor) {
                await actor.updateEmbeddedDocuments("Item", [
                  { _id: item.id, data: { rqid: newRqid } },
                ]);
              }
            } else {
              await item.update({ data: { rqid: newRqid } });
            }
        });
      });

    // Copy associated input value to clipboard
    $(this.form!)
      .find("[data-item-copy-input]")
      .each((i: number, el: HTMLElement) => {
        const itemId = getRequiredDomDataset($(el), "item-id");
        el.addEventListener("click", async () => {
          const input = el.previousElementSibling as HTMLInputElement;
          navigator.clipboard.writeText(input.value);
        });
      });
  }
}
