import { getGame } from "../system/util";
import Options = FormApplication.Options;

export class DefaultIconSettings extends FormApplication {
  constructor(object: any, options?: Partial<Options>) {
    super(object, options);
  }

  static get defaultOptions(): Options {
    return mergeObject(super.defaultOptions, {
      id: "default-icons-settings-dialog",
      title: "Default Item Icon Settings",
      template: "./systems/rqg/dialog/defaultIconSettings.hbs",
      classes: ["form", "default-icons"],
      width: 500,
      closeOnSubmit: false,
      submitOnChange: true,
    });
  }

  getData(): any {
    return getGame().settings.get("rqg", "defaultIconSettings");
  }

  async _updateObject(event: Event, formData?: object): Promise<void> {
    console.log("*** _updateObject", event, formData);
    if (formData != null) {
      const data = expandObject(formData);
      await getGame().settings.set("rqg", "defaultIconSettings", data);
      this.render();
    }
  }
}
