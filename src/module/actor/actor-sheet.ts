import {passionType, skillType} from "../data-model/item-data/item-types";
import {SkillCategoryEnum} from "../data-model/item-data/skill";

export class ActorSheetRqgCharacter extends ActorSheet {

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["rqg", "sheet", "actor"],
      template: "systems/rqg/module/actor/actor-sheet.html",
      width: 600,
      height: 600,
      tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description"}],
      dragDrop: [{dragSelector: ".item-list .item", dropSelector: null}]
    });
  }

  /* -------------------------------------------- */

  /** @override */
  getData(): ActorSheetData {
    // TODO move to Actor prepareData instead?
    const sheetData: any = super.getData(); // TODO define an ActorSheetData that extends the normal?

    // Convenience lookup for rune icons
    sheetData.data.runeIcons = {
      // Elemental Runes
      "fire": 'systems/rqg/icons/runes/fire_sky.svg',
      "darkness": 'systems/rqg/icons/runes/darkness.svg',
      "water": 'systems/rqg/icons/runes/water.svg',
      "earth": 'systems/rqg/icons/runes/earth.svg',
      "air": 'systems/rqg/icons/runes/air.svg',
      "moon": 'systems/rqg/icons/runes/moon_full.svg',

      // Power Runes
      "man": 'systems/rqg/icons/runes/man.svg',
      "beast": 'systems/rqg/icons/runes/beast.svg',
      "fertility": 'systems/rqg/icons/runes/fertility.svg',
      "death": 'systems/rqg/icons/runes/death.svg',
      "harmony": 'systems/rqg/icons/runes/harmony.svg',
      "disorder": 'systems/rqg/icons/runes/disorder.svg',
      "truth": 'systems/rqg/icons/runes/truth.svg',
      "illusion": 'systems/rqg/icons/runes/illusion.svg',
      "stasis": 'systems/rqg/icons/runes/stasis.svg',
      "movement": 'systems/rqg/icons/runes/movement_change.svg'
    }

    // Separate different item types into separate arrays
    const passions = sheetData.items.filter((i: Item) => i.type === passionType);
    const allSkills = sheetData.items.filter((i: Item) => i.type === skillType);
    const skills = {};
    Object.keys(SkillCategoryEnum).forEach((cat: string) => {
      skills[cat] = allSkills.filter((s) => cat === s.data.category);
    });

    sheetData.data.itemGroups = {
      skills,
      passions
    };

    console.log('******* SHEETDATA ', sheetData, skills, passions);
    return sheetData;
  }

  /** @override */
  activateListeners(html): void {
    super.activateListeners(html);

    // Use attributes data-item-edit & data-item-delete to specify what should be clicked to perform the action
    // Set data-item-edit=actor.items._id on the same or an outer element to specify what item the action should be performed on.

    // Edit (open the item sheet)
    this.form.querySelectorAll('[data-item-edit]')
      .forEach(el => {
        const itemId = el.closest('[data-item-id]').getAttribute('data-item-id');
        el.addEventListener('click', () => this.actor.getOwnedItem(itemId).sheet.render(true));
      });

    // Delete (remove item from actor)
    this.form.querySelectorAll('[data-item-delete]')
      .forEach(el => {
        const itemId = el.closest('[data-item-id]').getAttribute('data-item-id');
        el.addEventListener('click', () => this.actor.deleteOwnedItem(itemId));
      });
  }

  /* -------------------------------------------- */

  /** @override */
// setPosition(options={}) {
//   const position = super.setPosition(options);
//   console.log('*** *** this.element', this.element);
//   const sheetBody = (this.element as Element).querySelector(".sheet-body");
//   const bodyHeight = position.height - 192;
//   sheetBody.setAttribute("style", `"height: ${bodyHeight};"`);
//   return position;
// }

  /* -------------------------------------------- */

  /**
   * Listen for click events on an attribute control to modify the composition of attributes in the sheet
   * @param {MouseEvent} event    The originating left click event
   * @private
   */
// async _onClickAttributeControl(event) {
//   event.preventDefault();
//   const a = event.currentTarget;
//   const action = a.dataset.action;
//   const attrs = this.object.data.data.attributes;
//   const form = this.form;
//
//   // Add new attribute
//   if ( action === "create" ) {
//     const nk = Object.keys(attrs).length + 1;
//     let newKey: Element = document.createElement("div");
//     newKey.innerHTML = `<input type="text" name="data.attributes.attr${nk}.key" value="attr${nk}"/>`;
//     newKey = newKey.children[0];
//     form.appendChild(newKey);
//     await this._onSubmit(event);
//   }
//
//   // Remove existing attribute
//   else if ( action === "delete" ) {
//     const li = a.closest(".attribute");
//     li.parentElement.removeChild(li);
//     await this._onSubmit(event);
//   }
// }

  /* -------------------------------------------- */

  /** @override */
  _updateObject(event: Event, formData: any): Promise<any> { // TODO  | JQuery.Event - hur funkar eg det där? Hur vet man vad man får?
    console.log('*** Event + formData', event.target, formData);
    return this.object.update(formData);
  }
}
