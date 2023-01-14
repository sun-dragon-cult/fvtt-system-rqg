import { addRqidSheetHeaderButton } from "../documents/rqidSheetButton";
import { RqidLink } from "../data-model/shared/rqidLink";

export class RqgJournalSheet extends JournalSheet {
  protected _getHeaderButtons(): Application.HeaderButton[] {
    const systemHeaderButtons = super._getHeaderButtons();
    addRqidSheetHeaderButton(systemHeaderButtons, this);
    return systemHeaderButtons;
  }

  // Overriding activateListeners doesn't work since the TextEditor enricher isn't
  // run at that stage. This function is run after the page is complete.
  _activatePageListeners() {
    // @ts-expect-error _activatePageListeners
    super._activatePageListeners();
    const html = this.element;
    RqidLink.addRqidLinkClickHandlers(html);
  }
}
