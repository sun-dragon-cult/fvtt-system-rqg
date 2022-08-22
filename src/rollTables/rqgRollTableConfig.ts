import { addRqidSheetHeaderButton } from "../documents/rqidSheetButton";

export class RqgRollTableConfig extends RollTableConfig {
  protected _getHeaderButtons(): Application.HeaderButton[] {
    const systemHeaderButtons = super._getHeaderButtons();
    addRqidSheetHeaderButton(systemHeaderButtons, this);
    return systemHeaderButtons;
  }
}
