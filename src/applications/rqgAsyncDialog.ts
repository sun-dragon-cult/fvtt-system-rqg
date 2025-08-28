import { systemId } from "../system/config";
import { RqgError } from "../system/util";

/**
 * An awaitable dialog based on the Foundry Dialog.
 *
 * usage
 * @example
 * const myDialog = new RqgAsyncDialog<boolean>("myTitle", "<h1>my content</h1>");
 * const buttons = {
 *   submit: {
 *     icon: '<i class="fas fa-check"></i>',
 *     label: "my button label",
 *     callback: () => {
 *       myDialog.resolve(true);
 *     },
 *   },
 *   cancel: {
 *     icon: '<i class="fas fa-times"></i>',
 *     label: "my other button label",
 *     callback: () => myDialog.resolve(false),
 *   },
 * };
 *
 * const answer = await myDialog.setButtons(buttons, "submit").show();
 *
 * TODO Remove
 * @deprecated Use native v2 dialogs instead
 */
export class RqgAsyncDialog<T> {
  public resolve: (value: PromiseLike<T> | T) => void = () => {};
  public reject: (value: PromiseLike<T> | T) => void = () => {};

  private buttons: Record<string, Dialog.Button<unknown>> | undefined;
  private defaultButton: string | undefined;

  constructor(
    private title: string,
    private htmlContent: string,
    private cssClasses: string[] = [systemId, "dialog"],
  ) {}

  public setButtons(
    buttons: Record<string, Dialog.Button<unknown>>,
    defaultButton: string,
  ): RqgAsyncDialog<T> {
    this.buttons = buttons;
    this.defaultButton = defaultButton;
    return this;
  }

  public async show(): Promise<T> {
    return await new Promise((resolve, reject) => {
      if (!this.buttons || !this.defaultButton) {
        throw new RqgError("Dialog not initialised");
      }
      this.resolve = resolve;
      this.reject = reject;

      const dialog = new Dialog(
        {
          title: this.title,
          content: this.htmlContent,
          default: this.defaultButton,
          buttons: this.buttons,
          close: () => reject(),
        },
        { classes: this.cssClasses },
      );
      dialog.render(true);
    });
  }
}
