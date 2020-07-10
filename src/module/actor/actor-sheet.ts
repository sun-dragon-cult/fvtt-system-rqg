import {ActorDataRqg} from "../data-model/Actor/actor-data-rqg";
import {Modifiers} from "../modifiers";

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
    const data: any = super.getData(); // TODO define an ActorSheetData that extends the normal?

    // Convenience lookup for rune icons
    data.data.runeIcons = {
      // Elemental Runes
      "fire": 'systems/rqg/icons/runes/fire_sky.svg',
      "darkness":'systems/rqg/icons/runes/darkness.svg',
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
    // data.dtypes = ["String", "Number", "Boolean"];
    // for ( let attr of Object.values(data.data.attributes) ) {
    //   attr.isCheckbox = attr.dtype === "Boolean";
    // }
    return data;
  }

  /* -------------------------------------------- */

  /** @override */
  // activateListeners(html) {
  //   super.activateListeners(html);
  //
  //   // Everything below here is only needed if the sheet is editable
  //   if (!this.options.editable) return;
  //
  //   // Update Inventory Item
  //   html.find('.item-edit').click(ev => {
  //     const li = $(ev.currentTarget).parents(".item");
  //     const item = this.actor.getOwnedItem(li.data("itemId"));
  //     item.sheet.render(true);
  //   });
  //
  //   // Delete Inventory Item
  //   html.find('.item-delete').click(ev => {
  //     const li = $(ev.currentTarget).parents(".item");
  //     this.actor.deleteOwnedItem(li.data("itemId"));
  //     li.slideUp(200, () => this.render(false));
  //   });
  //
  //   // Add or Remove Attribute
  //   html.find(".attributes").on("click", ".attribute-control", this._onClickAttributeControl.bind(this));
  // }

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

  // FIXME Next Roadmap task !!!!
  /** @override */
  _updateObject(event: Event, formData: any): Promise<any> { // TODO  | JQuery.Event - hur funkar eg det där? Hur vet man vad man får?
    console.log('*** Event + formData', event.target, formData);
  //   debugger;
  //
  //   // // Handle the free-form attributes list
  //   // // @ts-ignore
  //   // const formChars = expandObject(formData).data.characteristics || {};
  //   // const attributes = Object.values(formChars).reduce((obj, v) => {
  //   //   let k = v["key"].trim();
  //   //   if (/[\s\.]/.test(k)) {
  //   //     return ui.notifications.error("Attribute keys may not contain spaces or periods");
  //   //   }
  //   //   delete v["key"];
  //   //   obj[k] = v;
  //   //   return obj;
  //   // }, {});
  //
  //   // // Remove attributes which are no longer used
  //   // for (let k of Object.keys(this.object.data.data.attributes)) {
  //   //   if (!attributes.hasOwnProperty(k)) attributes[`-=${k}`] = null;
  //   // }
  //
  //   // Re-combine formData
  //   // formData = Object.entries(formData)
  //   //   .map(e => {
  //   //     if (e[0].startsWith("data.characteristics")) {
  //   //       return [e[0], 42]; // TODO last entered ???
  //   //     } else {
  //   //       return e;  // TODO {_id: this.object._id, "data.attributes": attributes})
  //   //     }
  //   // }), {_id: this.object._id, "data.characteristics": formData.data.characteristics || {}};
  //
    // Update the Actor
    return this.object.update(formData);
  }
}
