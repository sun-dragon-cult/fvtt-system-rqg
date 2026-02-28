const RQG_CONTEXT_MENU_CLASS = "rqg";

import ContextMenu = foundry.applications.ux.ContextMenu;

export type RqgContextMenuOptions = {
  fixed?: boolean;
  onOpen?: (target: HTMLElement) => void;
  onClose?: (target: HTMLElement) => void;
};

/**
 * A ContextMenu subclass that adds the `rqg` CSS class to the
 * menu element after rendering.  This lets RQG context menus be styled
 * independently from Foundry's built-in context menus.
 *
 * Usage:
 * ```ts
 * new RqgContextMenu(htmlElement, selector, menuItems, options);
 * ```
 */
export class RqgContextMenu extends ContextMenu<false> {
  constructor(
    container: HTMLElement,
    selector: string,
    menuItems: ContextMenu.Entry<HTMLElement>[],
    options: RqgContextMenuOptions = {},
  ) {
    super(container, selector, menuItems, { ...options, jQuery: false as const });
  }

  override _setPosition(menu: HTMLElement, target: HTMLElement, options?: any): void {
    menu.classList.add(RQG_CONTEXT_MENU_CLASS);
    super._setPosition(menu, target, options);
  }
}
