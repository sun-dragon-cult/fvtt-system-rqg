import { expect, test } from "@playwright/test";

import {
  actorExistsByName,
  isActorSheetRendered,
  openActorSheetByName,
  resolveActorName,
} from "./utils/foundryActor";
import { loginToConfiguredWorld } from "./utils/foundrySession";

test("Configured RQG actor sheet opens", async ({ page, baseURL }) => {
  test.slow();

  const e2eConfig = await loginToConfiguredWorld(page, baseURL);
  let actorName: string | null = null;

  await expect
    .poll(
      async () => {
        actorName = await resolveActorName(page, e2eConfig.rqgActorName);
        return actorName;
      },
      {
        message: "Expected at least one actor to exist in the configured E2E world",
        timeout: 15000,
      },
    )
    .toBeTruthy();

  await expect
    .poll(
      async () => {
        const exists = await actorExistsByName(page, actorName!);
        if (!exists) {
          return false;
        }

        return openActorSheetByName(page, actorName!);
      },
      {
        message: `Expected actor "${actorName}" to exist in the configured E2E world`,
        timeout: 15000,
      },
    )
    .toBe(true);

  await expect
    .poll(async () => isActorSheetRendered(page, actorName!), {
      message: `Expected the RQG actor sheet for "${actorName}" to render`,
      timeout: 15000,
    })
    .toBe(true);

  await expect(page.locator(".window-title", { hasText: actorName! })).toHaveCount(1);
});
