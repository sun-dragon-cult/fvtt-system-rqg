import { addRqidSheetHeaderButton } from "../documents/rqidSheetButton";

export class RqgJournalSheet extends JournalSheet {
  protected _getHeaderButtons(): Application.HeaderButton[] {
    const systemHeaderButtons = super._getHeaderButtons();
    addRqidSheetHeaderButton(systemHeaderButtons, this);
    return systemHeaderButtons;
  }
}
