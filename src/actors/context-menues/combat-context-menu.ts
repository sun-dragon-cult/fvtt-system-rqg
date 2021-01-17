import { Ability } from "../../data-model/shared/ability";
import { RqgActorSheet } from "../rqgActorSheet";

export const combatMenuOptions = (actor) => [
  {
    name: "(Roll with Modifier)",
    icon: '<i class="fas fa-dice-d20"></i>',
    condition: () => true,
    callback: (el) => {
      console.log("======== Roll with Modifier");
    },
  },
  {
    name: "Roll",
    icon: '<i class="fas fa-dice-d20"></i>',
    condition: () => true,
    callback: (el) => {
      const itemId = (el[0].closest("[data-item-id]") as HTMLElement).dataset.skillId;
      const item: Item = actor.items.get(itemId);
      const result = Ability.rollAgainst(item.data.data.chance, 0, item.name);
    },
  },
  {
    name: "Toggle Experience",
    icon: '<i class="fas fa-lightbulb"></i>',
    condition: () => true,
    callback: async (el) => {
      const itemId = (el[0].closest("[data-skill-id]") as HTMLElement).dataset.skillId;
      const item = actor.getOwnedItem(itemId);
      await item.update({ "data.experience": !item.data.data.experience }, {});
    },
  },
  {
    // TODO view skill or item?
    name: "View Description",
    icon: '<i class="fas fa-book-open"></i>',
    condition: () => true,
    callback: async (el) => {
      const itemId = (el[0].closest("[data-item-id]") as HTMLElement).dataset.itemId;
      let firstItemEl = el[0];
      while (firstItemEl.previousElementSibling.dataset.itemId === itemId) {
        firstItemEl = firstItemEl.previousElementSibling;
      }
      let entity;

      // Target 1 - Compendium Link
      if (firstItemEl.dataset.pack) {
        const pack = game.packs.get(firstItemEl.dataset.pack);
        let id = firstItemEl.dataset.id;
        if (firstItemEl.dataset.lookup) {
          if (!pack.index.length) await pack.getIndex();
          const entry = pack.index.find(
            (i) => i._id === firstItemEl.dataset.lookup || i.name === firstItemEl.dataset.lookup
          );
          id = entry._id;
        }
        entity = id ? await pack.getEntity(id) : null;
      }

      // Target 2 - World Entity Link
      else {
        const cls = CONFIG[firstItemEl.dataset.entity].entityClass;
        entity = cls.collection.get(firstItemEl.dataset.id);
        if (entity.entity === "Scene" && entity.journal) entity = entity.journal;
        if (!entity.hasPerm(game.user, "LIMITED")) {
          return ui.notifications.warn(
            `You do not have permission to view this ${entity.entity} sheet.`
          );
        }
      }
      // if ( !entity ) return;

      // // Action 1 - Execute an Action
      // if ( entity.entity === "Macro" ) {
      //   if ( !entity.hasPerm(game.user, "LIMITED") ) {
      //     return ui.notifications.warn(`You do not have permission to use this ${entity.entity}.`);
      //   }
      //   return entity.execute();
      // }

      // Action 2 - Render the Entity sheet
      entity && entity.sheet.render(true);
    },
  },
  {
    name: "Edit Skill",
    icon: '<i class="fas fa-edit"></i>',
    condition: () => game.user.isGM,
    callback: (el) => {
      const itemId = (el[0].closest("[data-skill-id]") as HTMLElement).dataset.skillId;
      if (!itemId) {
        ui.notifications.warn("Couldn't find item with id" + itemId);
      }
      actor.getOwnedItem(itemId).sheet.render(true);
    },
  },
  {
    name: "Edit Weapon",
    icon: '<i class="fas fa-edit"></i>',
    condition: () => game.user.isGM,
    callback: (el) => {
      const itemId = (el[0].closest("[data-item-id]") as HTMLElement).dataset.itemId;
      if (!itemId) {
        ui.notifications.warn("Couldn't find item with id " + itemId);
      }
      actor.getOwnedItem(itemId).sheet.render(true);
    },
  },
  {
    name: "Delete Skill",
    icon: '<i class="fas fa-trash"></i>',
    condition: () => game.user.isGM,
    callback: (el) => {
      const itemId = (el[0].closest("[data-skill-id]") as HTMLElement).dataset.skillId;
      if (!itemId) {
        ui.notifications.warn("Couldn't find item with id " + itemId);
      }
      RqgActorSheet.confirmItemDelete(actor, itemId);
    },
  },
  {
    name: "Delete Weapon",
    icon: '<i class="fas fa-trash"></i>',
    condition: () => game.user.isGM,
    callback: (el) => {
      const itemId = (el[0].closest("[data-item-id]") as HTMLElement).dataset.itemId;
      if (!itemId) {
        ui.notifications.warn("Couldn't find item with id " + itemId);
      }
      RqgActorSheet.confirmItemDelete(actor, itemId);
    },
  },
];
