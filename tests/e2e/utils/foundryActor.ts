import type { Page } from "@playwright/test";

export async function resolveActorName(
  page: Page,
  preferredActorName: string,
): Promise<string | null> {
  return page.evaluate((preferredName) => {
    const gameRef = globalThis as {
      game?: {
        actors?: {
          getName?: (name: string) => { name?: string } | null;
          contents?: Array<{ name?: string }>;
        };
      };
    };

    const preferred = gameRef.game?.actors?.getName?.(preferredName)?.name;
    if (typeof preferred === "string" && preferred.length > 0) {
      return preferred;
    }

    const fallback = gameRef.game?.actors?.contents?.[0]?.name;
    if (typeof fallback === "string" && fallback.length > 0) {
      return fallback;
    }

    return null;
  }, preferredActorName);
}

export async function actorExistsByName(page: Page, actorName: string): Promise<boolean> {
  return page.evaluate((name) => {
    const gameRef = globalThis as {
      game?: {
        actors?: {
          getName?: (name: string) => { id?: string } | null;
        };
      };
    };

    return Boolean(gameRef.game?.actors?.getName?.(name));
  }, actorName);
}

export async function openActorSheetByName(page: Page, actorName: string): Promise<boolean> {
  return page.evaluate((name) => {
    const gameRef = globalThis as {
      game?: {
        actors?: {
          getName?: (name: string) => { sheet?: { render?: (force?: boolean) => void } } | null;
        };
      };
    };

    const actor = gameRef.game?.actors?.getName?.(name);
    if (!actor?.sheet?.render) {
      return false;
    }

    actor.sheet.render(true);
    return true;
  }, actorName);
}

export async function isActorSheetRendered(page: Page, actorName: string): Promise<boolean> {
  return page.evaluate((name) => {
    const gameRef = globalThis as {
      game?: {
        actors?: {
          getName?:
            | ((name: string) => {
                sheet?: {
                  rendered?: boolean;
                  element?: { 0?: Element; get?: (index: number) => Element | undefined };
                };
              })
            | null;
        };
      };
    };
    const uiRef = globalThis as {
      ui?: { windows?: Record<string, { title?: string; rendered?: boolean }> };
    };

    const actorSheet = gameRef.game?.actors?.getName?.(name)?.sheet;
    if (actorSheet?.rendered) {
      return true;
    }

    const sheetRoot = actorSheet?.element?.get?.(0) ?? actorSheet?.element?.[0];
    if (sheetRoot instanceof Element && sheetRoot.isConnected) {
      return true;
    }

    const appWindowMatch = Object.values(uiRef.ui?.windows ?? {}).some(
      (app) => app.rendered && app.title?.includes(name),
    );
    if (appWindowMatch) {
      return true;
    }

    return Boolean(document.querySelector(`input[name="name"][value="${name}"]`));
  }, actorName);
}

export async function triggerFirstWeaponAttack(page: Page, actorName: string): Promise<boolean> {
  return page.evaluate((name) => {
    const gameRef = globalThis as {
      game?: {
        actors?: {
          getName?: (name: string) => {
            items?: {
              contents?: Array<{
                type?: string;
                attack?: () => Promise<void>;
              }>;
            };
          } | null;
        };
      };
    };

    const actor = gameRef.game?.actors?.getName?.(name);
    const weapon = actor?.items?.contents?.find(
      (item) => item.type === "weapon" && typeof item.attack === "function",
    );

    if (!weapon?.attack) {
      return false;
    }

    void weapon.attack();
    return true;
  }, actorName);
}
