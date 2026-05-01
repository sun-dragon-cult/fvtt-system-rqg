import { expect, type Page } from "@playwright/test";

import { getE2EConfig, type E2EConfig } from "./e2eConfig";
import { detectRunningFoundryUrl } from "./foundryRuntime";

async function selectUserCaseInsensitive(page: Page, userName: string) {
  const userOptions = await page.locator("select option").evaluateAll((options) =>
    options.map((option) => ({
      label: option.textContent?.trim() ?? "",
      disabled: option instanceof HTMLOptionElement ? option.disabled : false,
    })),
  );

  const matchingUser = userOptions.find(
    (option) => option.label.toLowerCase() === userName.toLowerCase(),
  );
  expect(matchingUser, `Foundry user "${userName}" was not found on the join page`).toBeTruthy();

  if (matchingUser?.disabled) {
    throw new Error(
      `Foundry user "${matchingUser.label}" is disabled on the join page, which usually means that user is already connected in another session. Close the existing session or change E2E_FOUNDRY_USER for Playwright runs.`,
    );
  }

  await page.locator("select").selectOption({ label: matchingUser!.label });
}

export async function loginToConfiguredWorld(
  page: Page,
  configuredBaseUrl?: string,
): Promise<E2EConfig> {
  const foundryUrl = await detectRunningFoundryUrl(configuredBaseUrl);
  expect(
    foundryUrl,
    "No running Foundry instance found on localhost ports 30013-30025",
  ).toBeTruthy();

  const e2eConfig = await getE2EConfig();

  await page.goto(`${foundryUrl}/setup`, { waitUntil: "networkidle", timeout: 15000 });

  const worldCard = page.locator("li.package.world", {
    has: page.getByRole("heading", { name: e2eConfig.foundryWorld }),
  });

  if (await worldCard.count()) {
    await worldCard.click();
    await page.waitForURL(/\/join$/, { timeout: 15000 });
  } else {
    await page.goto(`${foundryUrl}/join`, { waitUntil: "networkidle", timeout: 15000 });
    await expect(
      page.getByRole("heading", { name: e2eConfig.foundryWorld }),
      `Expected Foundry join page to be for the world "${e2eConfig.foundryWorld}"`,
    ).toHaveCount(1);
  }

  await selectUserCaseInsensitive(page, e2eConfig.foundryUser);
  await page.locator('input[name="password"]').fill(e2eConfig.foundryPassword);
  await page.getByRole("button", { name: "Join Game Session" }).click();

  await page
    .waitForFunction(
      () => {
        const ui = (globalThis as { ui?: { notifications?: { error?: unknown[] } } }).ui;
        return Boolean(ui?.notifications?.error?.length);
      },
      { timeout: 3000 },
    )
    .catch(() => undefined);

  const invalidPasswordNotice = page.getByText(
    new RegExp(`Invalid password provided for ${e2eConfig.foundryUser}`, "i"),
  );
  if (await invalidPasswordNotice.count()) {
    throw new Error(
      `Foundry rejected the configured E2E credentials for user "${e2eConfig.foundryUser}". Update E2E_FOUNDRY_PASSWORD in .env.local to match the world user password.`,
    );
  }

  await page.waitForURL(/\/game$/, { timeout: 15000 });
  await page.waitForLoadState("networkidle");

  return e2eConfig;
}
