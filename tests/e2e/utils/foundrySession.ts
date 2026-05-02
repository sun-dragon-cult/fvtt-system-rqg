import { expect, type Page } from "@playwright/test";

import { getE2EConfig, type E2EConfig } from "./e2eConfig";
import { detectRunningFoundryUrl } from "./foundryRuntime";

const SETUP_RETRIES = 5;
const JOIN_RETRIES = 3;
const RETRY_WAIT_MS = 1500;

async function clearFoundryClickInterceptors(page: Page) {
  await page.keyboard.press("Escape").catch(() => undefined);
  await page
    .evaluate(() => {
      for (const selector of [".tour-overlay", "#notifications"]) {
        for (const element of document.querySelectorAll<HTMLElement>(selector)) {
          element.style.pointerEvents = "none";
        }
      }
    })
    .catch(() => undefined);
}

async function dismissFoundryFirstRunUI(page: Page) {
  await clearFoundryClickInterceptors(page);

  for (let i = 0; i < 3; i++) {
    const dismissButton = page.getByRole("button", {
      name: /close|dismiss|skip|got it|done|ok|okay/i,
    });
    if (await dismissButton.count()) {
      await dismissButton
        .first()
        .click({ force: true })
        .catch(() => undefined);
    }
    await page.keyboard.press("Escape").catch(() => undefined);
    await page.waitForTimeout(150);
  }
}

async function isCriticalFailureVisible(page: Page) {
  return page
    .getByRole("heading", { name: /critical failure/i })
    .first()
    .isVisible()
    .catch(() => false);
}

async function clickGoBackFromCriticalFailure(page: Page, logMessage: string) {
  const goBackLink = page.locator('a[href="/setup"]').first();
  if (await goBackLink.count()) {
    console.log(logMessage);
    await goBackLink.click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    return true;
  }

  return false;
}

async function resolveWorldCardByPackageId(page: Page, worldPackageId: string) {
  const normalizedTarget = worldPackageId.trim().toLowerCase();
  const cards = page.locator("li.package.world");
  const count = await cards.count();

  for (let i = 0; i < count; i++) {
    const card = cards.nth(i);
    const packageId = ((await card.getAttribute("data-package-id")) ?? "").trim().toLowerCase();
    if (packageId === normalizedTarget) {
      return card;
    }
  }

  return null;
}

async function listWorldPackageIds(page: Page) {
  return page.evaluate(() => {
    return Array.from(document.querySelectorAll<HTMLElement>("li.package.world"))
      .map((card) => (card.getAttribute("data-package-id") ?? "").trim())
      .filter((value) => value.length > 0);
  });
}

async function clickWorldLaunchByPackageId(page: Page, worldPackageId: string) {
  return page.evaluate((targetPackageId) => {
    const normalizedTarget = targetPackageId.trim().toLowerCase();
    const cards = Array.from(document.querySelectorAll<HTMLElement>("li.package.world"));

    const worldCard = cards.find((card) => {
      const packageId = (card.getAttribute("data-package-id") ?? "").trim().toLowerCase();
      return packageId === normalizedTarget;
    });

    if (!worldCard) {
      return false;
    }

    const launchControl = worldCard.querySelector<HTMLElement>('a[data-action="worldLaunch"]');
    if (!launchControl) {
      return false;
    }

    launchControl.click();
    return true;
  }, worldPackageId);
}

async function clickWorldLaunchAndWait(page: Page, worldPackageId: string, foundryBaseUrl: string) {
  const worldCard = await resolveWorldCardByPackageId(page, worldPackageId);
  if (!worldCard) {
    throw new Error(`World card with data-package-id="${worldPackageId}" was not found.`);
  }

  await clearFoundryClickInterceptors(page);
  await worldCard.waitFor({ state: "visible", timeout: 8000 });

  const clicked = await clickWorldLaunchByPackageId(page, worldPackageId);
  if (!clicked) {
    throw new Error('Expected world launch control a[data-action="worldLaunch"] was not found.');
  }

  const passwordInput = page.locator('input[name="password"]');
  const criticalFailureHeading = page.getByRole("heading", { name: /critical failure/i });

  // Some Foundry variants still render a global launch control.
  const launchWorldButton = page.getByRole("button", {
    name: /launch world|launch game world|launch/i,
  });
  if (!(await passwordInput.count()) && (await launchWorldButton.count())) {
    await clearFoundryClickInterceptors(page);
    await launchWorldButton
      .first()
      .click({ force: true })
      .catch(() => undefined);
  }

  await Promise.race([
    passwordInput.first().waitFor({ state: "visible", timeout: 5000 }),
    criticalFailureHeading.first().waitFor({ state: "visible", timeout: 5000 }),
  ]).catch(() => undefined);

  // Last resort: if there was no visible transition, navigate directly to join.
  if (!(await passwordInput.count()) && !(await isCriticalFailureVisible(page))) {
    await page.goto(`${foundryBaseUrl}/join`, { waitUntil: "networkidle", timeout: 15000 });
  }
}

async function isJoinPageReady(page: Page) {
  const userOptions = page.locator("select option");
  const passwordInput = page.locator('input[name="password"]');
  return (await userOptions.count()) > 0 && (await passwordInput.count()) > 0;
}

async function hasWorldCardByPackageId(page: Page, worldPackageId: string) {
  const worldCard = await resolveWorldCardByPackageId(page, worldPackageId);
  return Boolean(worldCard);
}

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
  const foundryBaseUrl = `${foundryUrl}`;

  // Navigate to setup with retry loop in case of critical failure loops
  let setupAttempts = 0;
  let onSetupPage = false;
  while (setupAttempts < SETUP_RETRIES && !onSetupPage) {
    setupAttempts++;
    console.log(`[E2E] Setup navigation attempt ${setupAttempts}`);

    await page.goto(foundryBaseUrl, { waitUntil: "networkidle", timeout: 15000 });
    await dismissFoundryFirstRunUI(page);

    // Some environments route directly to Join; treat that as a ready state.
    if (await isJoinPageReady(page)) {
      console.log("[E2E] Foundry routed directly to Join page; continuing login flow");
      onSetupPage = true;
      break;
    }

    // Check for Foundry critical failure page and dismiss it
    if (await isCriticalFailureVisible(page)) {
      console.log(`[E2E] Critical failure page detected on attempt ${setupAttempts}`);
      await clickGoBackFromCriticalFailure(page, "[E2E] Clicking go-back link...");
      continue; // Try setup again
    }

    // Setup page is ready once the configured world card is present.
    if (await hasWorldCardByPackageId(page, e2eConfig.foundryWorld)) {
      console.log("[E2E] Setup page ready (world card is present)");
      onSetupPage = true;
    } else {
      const packageIds = await listWorldPackageIds(page);
      console.log(
        `[E2E] Setup loaded but target world card not found yet. Available package ids: ${packageIds.join(", ") || "<none>"}`,
      );
      await page.waitForTimeout(RETRY_WAIT_MS);
      continue;
    }
  }

  if (!onSetupPage) {
    const packageIds = await listWorldPackageIds(page);
    throw new Error(
      `Could not reach Foundry setup page after ${SETUP_RETRIES} attempts. Available package ids: ${packageIds.join(", ") || "<none>"}. A critical-failure page or first-run tour may still be blocking setup.`,
    );
  }

  // Only launch world from setup when not already on join.
  if (!(await isJoinPageReady(page))) {
    await clickWorldLaunchAndWait(page, e2eConfig.foundryWorld, foundryBaseUrl);
  }

  // Re-check for critical failure after navigation and dismiss if found
  let joinAttempts = 0;
  while (joinAttempts < JOIN_RETRIES) {
    joinAttempts++;
    await dismissFoundryFirstRunUI(page);
    if (await isCriticalFailureVisible(page)) {
      console.log(`[E2E] Critical failure page detected on join attempt ${joinAttempts}`);

      await clickGoBackFromCriticalFailure(
        page,
        "[E2E] Clicking go-back link to recover from join failure...",
      );

      // Retry through Foundry's normal flow from base URL.
      console.log("[E2E] Retrying from base URL and reselecting world...");
      await page.goto(foundryBaseUrl, { waitUntil: "networkidle", timeout: 15000 });
      await clickWorldLaunchAndWait(page, e2eConfig.foundryWorld, foundryBaseUrl).catch(
        () => undefined,
      );
      continue;
    }

    if (await isJoinPageReady(page)) {
      console.log("[E2E] Successfully reached join page with login controls");
      break;
    }

    console.log("[E2E] Join controls not found; waiting before retry...");
    await page.waitForTimeout(RETRY_WAIT_MS);
  }

  await expect(page.locator("select option")).not.toHaveCount(0);
  await expect(page.locator('input[name="password"]')).toHaveCount(1);

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
