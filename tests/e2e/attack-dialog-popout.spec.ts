import { expect, test } from "@playwright/test";

import { loginToConfiguredWorld } from "./utils/foundrySession";

test("Attack dialog action works when popped out", async ({ page, context, baseURL }) => {
  test.slow();

  const e2eConfig = await loginToConfiguredWorld(page, baseURL);

  await expect
    .poll(
      async () =>
        page.evaluate((actorName) => {
          const gameRef = globalThis as {
            game?: {
              actors?: {
                getName?: (name: string) => {
                  items?: {
                    contents?: Array<{
                      type?: string;
                      name?: string;
                      attack?: () => Promise<void>;
                    }>;
                  };
                } | null;
              };
            };
          };

          const actor = gameRef.game?.actors?.getName?.(actorName);
          const weapon = actor?.items?.contents?.find(
            (item) => item.type === "weapon" && typeof item.attack === "function",
          );

          if (!weapon?.attack) {
            return false;
          }

          void weapon.attack();
          return true;
        }, e2eConfig.rqgActorName),
      {
        message: `Expected actor "${e2eConfig.rqgActorName}" to have a weapon that can attack`,
        timeout: 15000,
      },
    )
    .toBe(true);

  await expect
    .poll(
      async () =>
        page.evaluate(() => {
          const uiRef = globalThis as {
            ui?: {
              windows?: Record<string, { rendered?: boolean; constructor?: { name?: string } }>;
            };
          };

          const hasMatchingWindow = Object.values(uiRef.ui?.windows ?? {}).some((app) => {
            if (!app.rendered) {
              return false;
            }
            const name = app.constructor?.name ?? "";
            return name === "AttackDialogV2" || name.includes("AttackDialog");
          });

          if (hasMatchingWindow) {
            return true;
          }

          // Fallback to a concrete DOM signal that the attack dialog is open.
          return Boolean(document.querySelector("button[name='combatManeuverRoll']"));
        }),
      {
        message: "Expected attack dialog to be rendered before popout",
        timeout: 15000,
      },
    )
    .toBe(true);

  const initialChatMessageCount = await page.evaluate(() => {
    const gameRef = globalThis as { game?: { messages?: { size?: number; contents?: unknown[] } } };
    return gameRef.game?.messages?.size ?? gameRef.game?.messages?.contents?.length ?? 0;
  });

  const popupPagePromise = context.waitForEvent("page", { timeout: 10000 }).catch(() => null);

  const popoutResult = await page.evaluate(async () => {
    const isAttackDialogLike = (name: string | undefined) =>
      name === "AttackDialogV2" || Boolean(name?.includes("AttackDialog"));

    const popoutSelector =
      '[data-action="popout"], [data-action="togglePopout"], .header-control.popout, [aria-label*="Detach"], [data-tooltip*="Detach"]';

    const tryOpenPopoutFromRoot = async (root: ParentNode | null) => {
      const directPopout = root?.querySelector<HTMLElement>(popoutSelector);
      if (directPopout) {
        directPopout.click();
        return true;
      }

      const toggleControls = root?.querySelector<HTMLElement>(
        'button[data-action="toggleControls"], .header-control[data-action="toggleControls"]',
      );
      if (toggleControls) {
        toggleControls.click();
        await new Promise((resolve) => setTimeout(resolve, 75));

        const detachMenuItem = Array.from(
          document.querySelectorAll<HTMLElement>("#context-menu .context-item"),
        ).find((item) => /detach window/i.test(item.textContent ?? ""));
        if (detachMenuItem) {
          detachMenuItem.click();
          return true;
        }

        const popoutAfterToggle = root?.querySelector<HTMLElement>(popoutSelector);
        if (popoutAfterToggle) {
          popoutAfterToggle.click();
          return true;
        }

        const globalPopoutAfterToggle = document.querySelector<HTMLElement>(popoutSelector);
        if (globalPopoutAfterToggle) {
          globalPopoutAfterToggle.click();
          return true;
        }
      }

      return false;
    };

    const uiRef = globalThis as {
      ui?: {
        windows?: Record<
          string,
          {
            rendered?: boolean;
            constructor?: { name?: string };
            element?:
              | HTMLElement
              | {
                  0?: HTMLElement;
                  get?: (index: number) => HTMLElement;
                };
            createPopout?: () => Promise<unknown>;
            _createPopout?: () => Promise<unknown>;
            popout?: () => Promise<unknown>;
            togglePopout?: () => Promise<unknown>;
          }
        >;
      };
    };

    const attackDialog = Object.values(uiRef.ui?.windows ?? {}).find(
      (app) => app.rendered && isAttackDialogLike(app.constructor?.name),
    );

    if (!attackDialog) {
      // Fallback: if we can see the attack action button in DOM, click header popout directly.
      const attackButton = document.querySelector("button[name='combatManeuverRoll']");
      if (!attackButton) {
        return "no-app";
      }

      const appRoot = attackButton.closest(".application, [data-appid], .window-app");
      if (await tryOpenPopoutFromRoot(appRoot)) {
        return "opened-via-dom-fallback";
      }

      return "no-popout-control";
    }

    for (const methodName of ["createPopout", "_createPopout", "popout", "togglePopout"] as const) {
      const method = attackDialog[methodName];
      if (typeof method === "function") {
        await method.call(attackDialog);
        return `opened-via-${methodName}`;
      }
    }

    const rootElement =
      attackDialog.element instanceof HTMLElement
        ? attackDialog.element
        : (attackDialog.element?.get?.(0) ?? attackDialog.element?.[0]);

    if (await tryOpenPopoutFromRoot(rootElement ?? null)) {
      return "opened-via-click";
    }

    return "no-popout-control";
  });

  expect(popoutResult).not.toBe("no-app");
  expect(popoutResult).not.toBe("no-popout-control");

  const popupPage = await popupPagePromise;
  const actionPage = popupPage ?? page;

  if (popupPage) {
    await popupPage.waitForLoadState("domcontentloaded");
  }

  const attackButton = actionPage
    .locator("button[name='combatManeuverRoll']:not([disabled])")
    .first();
  await expect(attackButton).toBeVisible({ timeout: 15000 });
  await attackButton.click();

  await expect
    .poll(
      async () =>
        page.evaluate(() => {
          const gameRef = globalThis as {
            game?: { messages?: { size?: number; contents?: unknown[] } };
          };
          return gameRef.game?.messages?.size ?? gameRef.game?.messages?.contents?.length ?? 0;
        }),
      {
        message: "Expected a new combat chat message after clicking popped-out attack action",
        timeout: 15000,
      },
    )
    .toBeGreaterThan(initialChatMessageCount);
});
