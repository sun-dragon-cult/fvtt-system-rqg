import Options = Application.Options;

export class RqgPause extends Pause {
  public static init() {
    CONFIG.ui.pause = RqgPause;
  }

  static get defaultOptions(): Options {
    return mergeObject(super.defaultOptions, {
      template: "systems/rqg/foundryUi/pause.hbs",
    });
  }

  getData(options?: Application.RenderOptions): any {
    return {
      // @ts-ignore paused
      paused: game.paused,
      pauseImage: "systems/rqg/assets/images/runes/movement_change.svg",
    };
  }
}
