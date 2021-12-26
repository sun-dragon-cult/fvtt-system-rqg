import { getGame } from "../system/util";

export class DefaultIconSettings extends FormApplication {
  constructor(options: any) {
    super(options);
    this.options = options;
  }

  static get defaultOptions(): FormApplication.Options {
      return mergeObject(super.defaultOptions, {
        classes: ['form'],
        popOut: true,
        template: 'defaultIconSettings.hbs',
        id: "default-icons-settings-dialog",
        title: "Default Icon Settings",
      })
  }

  getData(
    options?: Application.RenderOptions
  ):
    | FormApplication.Data<{}, FormApplication.Options>
    | Promise<FormApplication.Data<{}, FormApplication.Options>> {
    const data: FormApplication.Data<{}, FormApplication.Options> = getGame().settings.get(
      "rqg",
      "defaultIconSettings"
    ) as FormApplication.Data<{}, FormApplication.Options>;
    return data;
  }

  protected _updateObject(event: Event, formData?: object): Promise<unknown> {
    if (formData !== undefined) {
      const data = expandObject(formData);
      getGame().settings.set("rqg", "defaultIconSettings", data);
    }
    return Promise.resolve();
  }
}
