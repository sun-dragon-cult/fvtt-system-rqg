import { expect, test } from "@playwright/test";

import { loginToConfiguredWorld } from "./utils/foundrySession";

test("Configured RQG world loads in Foundry", async ({ page, baseURL }) => {
  test.slow();

  await loginToConfiguredWorld(page, baseURL);

  await expect
    .poll(
      async () =>
        page.evaluate(() => {
          const gameRef = globalThis as { game?: { system?: { id?: string } } };
          return gameRef.game?.system?.id ?? null;
        }),
      {
        message: "Expected the loaded world to initialize the rqg system",
        timeout: 15000,
      },
    )
    .toBe("rqg");
});
