import { getGame } from "../system/util";
import Options = FormApplication.Options;

export class HitLocationSettings extends FormApplication {
  constructor(object: any, options?: Partial<Options>) {
    super(object, options);
  }

  static get defaultOptions(): Options {
    return mergeObject(super.defaultOptions, {
      id: "hit-location-settings-dialog",
      title: getGame().i18n.localize("RQG.Settings.Hitlocations.dialogTitle"),
      template: "./systems/rqg/dialog/hitLocationSettings.hbs",
      classes: ["form", "hit-location-settings"],
      width: 600,
      closeOnSubmit: false,
      submitOnChange: true,
    });
  }

  getData(): any {
    return getGame().settings.get("rqg", "hitLocations");
  }

  async _updateObject(event: Event, formData?: object): Promise<void> {
    if (formData != null) {
      const data = {
        hitLocationItemNames: [
          ...new Set(
            expandObject(formData)
              .hitLocationItemNames.map((i: string) => i.trim())
              .filter((i: string) => i)
          ),
        ].sort((a: unknown, b: unknown) => ("" + a).localeCompare("" + b)),
      };
      await getGame().settings.set("rqg", "hitLocations", data);
      this.render();
    }
  }
}
