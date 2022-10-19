import { getGame, localize } from "../system/util";
import Options = FormApplication.Options;
import { systemId } from "../system/config";

export class HitLocationSettings extends FormApplication {
  constructor(object: any, options?: Partial<Options>) {
    super(object, options);
  }

  static get defaultOptions(): Options {
    return mergeObject(super.defaultOptions, {
      id: "hit-location-settings-dialog",
      title: localize("RQG.Settings.HitLocations.dialogTitle"),
      template: "./systems/rqg/applications/hitLocationSettings.hbs",
      classes: ["form", "hit-location-settings"],
      width: 600,
      closeOnSubmit: false,
      submitOnChange: true,
    });
  }

  getData(): any {
    return getGame().settings.get(systemId, "hitLocations");
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
      await getGame().settings.set(systemId, "hitLocations", data);
      this.render();
    }
  }
}
