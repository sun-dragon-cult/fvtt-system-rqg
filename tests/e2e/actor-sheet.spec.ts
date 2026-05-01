import { expect, test } from "@playwright/test";

import { loginToConfiguredWorld } from "./utils/foundrySession";

test("Configured RQG actor sheet opens", async ({ page, baseURL }) => {
  test.slow();

  const e2eConfig = await loginToConfiguredWorld(page, baseURL);

  await expect
    .poll(
      async () =>
        page.evaluate((actorName) => {
          const gameRef = globalThis as {
            game?: {
              actors?: {
                getName?: (name: string) => { sheet: { render: (force?: boolean) => void } } | null;
              };
            };
          };

          const actor = gameRef.game?.actors?.getName?.(actorName);
          if (!actor) {
            return false;
          }

          actor.sheet.render(true);
          return true;
        }, e2eConfig.rqgActorName),
      {
        message: `Expected actor "${e2eConfig.rqgActorName}" to exist in the configured E2E world`,
        timeout: 15000,
      },
    )
    .toBe(true);

  await expect
    .poll(
      async () =>
        page.evaluate((actorName) => {
          const uiRef = globalThis as {
            ui?: { windows?: Record<string, { title?: string; rendered?: boolean }> };
          };

          return Object.values(uiRef.ui?.windows ?? {}).some(
            (app) => app.rendered && app.title?.includes(actorName),
          );
        }, e2eConfig.rqgActorName),
      {
        message: `Expected the RQG actor sheet for "${e2eConfig.rqgActorName}" to render`,
        timeout: 15000,
      },
    )
    .toBe(true);

  await expect(page.locator(".window-title", { hasText: e2eConfig.rqgActorName })).toHaveCount(1);
  await expect(page.locator(`input[name="name"][value="${e2eConfig.rqgActorName}"]`)).toHaveCount(
    1,
  );
});
