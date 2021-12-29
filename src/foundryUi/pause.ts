export class RqgPause extends Pause {
  public static init() {
    CONFIG.ui.pause = RqgPause;
  }

  get template() {
    return "systems/rqg/foundryUi/pause.hbs";
  }
}
