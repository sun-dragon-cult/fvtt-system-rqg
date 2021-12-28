import { getGame } from "../system/util";
import Options = FormApplication.Options;

export class DefaultIconSettings extends FormApplication {
  constructor(object: any, options?: Partial<Options>) {
    super(object, options);
  }

  static get defaultOptions(): Options {
    return mergeObject(super.defaultOptions, {
      id: "default-icons-settings-dialog",
      title: getGame().i18n.localize("RQG.Settings.DefaultItemIcons.title"),
      template: "./systems/rqg/dialog/defaultIconSettings.hbs",
      classes: ["form", "default-icons"],
      width: 500,
      closeOnSubmit: false,
      submitOnChange: true,
    });
  }

  protected _onSelectFile(selection: string, filePicker: FilePicker): void {
    super._onSelectFile(selection, filePicker);
    this.submit();
  }

  getData(): any {
    return getGame().settings.get("rqg", "defaultIconSettings");
  }

  async _updateObject(event: Event, formData?: object): Promise<void> {
    if (formData != null) {
      const data = expandObject(formData);
      await getGame().settings.set("rqg", "defaultIconSettings", data);
      this.render();
    }
  }
}
