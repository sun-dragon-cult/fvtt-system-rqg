import Options = Application.Options;
import { templatePaths } from "../system/loadHandlebarsTemplates";

export class RqgPause extends Pause {
  public static init() {
    CONFIG.ui.pause = RqgPause;
  }

  static get defaultOptions(): Options {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: templatePaths.rqgPause,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getData(options?: Application.RenderOptions): any {
    return {
      // @ts-expect-error paused
      paused: game.paused,
      pauseImage: "systems/rqg/assets/images/runes/movement_change.svg",
    };
  }
}
