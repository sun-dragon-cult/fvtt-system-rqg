import { getGame } from "../system/util";
import Options = FormApplication.Options;

export class DefaultItemIconSettings extends FormApplication {
  constructor(object: any, options?: Partial<Options>) {
    super(object, options);
  }

  static get defaultOptions(): Options {
    return mergeObject(super.defaultOptions, {
      id: "default-icons-settings-dialog",
      title: getGame().i18n.localize("RQG.Settings.DefaultItemIcons.dialogTitle"),
      template: "./systems/rqg/dialog/defaultItemIconSettings.hbs",
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
    return getGame().settings.get("rqg", "defaultItemIconSettings");
  }

  async _updateObject(event: Event, formData?: object): Promise<void> {
    if (formData != null) {
      const data = expandObject(formData);
      await getGame().settings.set("rqg", "defaultItemIconSettings", data);
      this.render();
    }
  }
}
