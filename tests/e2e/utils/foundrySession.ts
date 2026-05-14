import { expect, type Page } from "@playwright/test";

import { getE2EConfig, type E2EConfig } from "./e2eConfig";
import { detectRunningFoundryUrl } from "./foundryRuntime";

const SETUP_RETRIES = 5;
const JOIN_RETRIES = 3;
const RETRY_WAIT_MS = 1500;

async function isAdminAccessGateVisible(page: Page) {
  const adminHeading = page.getByRole("heading", { name: /administrator access required/i });
  const adminPasswordInput = page.getByPlaceholder(/administrator password/i);
  return (await adminHeading.count()) > 0 && (await adminPasswordInput.count()) > 0;
}

async function loginToSetupIfNeeded(page: Page, adminPassword: string | null) {
  if (!(await isAdminAccessGateVisible(page))) {
    return;
  }

  if (!adminPassword) {
    throw new Error(
      "Foundry setup is protected by an administrator password. Set E2E_FOUNDRY_ADMIN_PASSWORD in .env.local for Playwright E2E runs.",
    );
  }

  await page.getByPlaceholder(/administrator password/i).fill(adminPassword);
  await page.getByRole("button", { name: /log in/i }).click();
  await page.waitForLoadState("networkidle");
}

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

async function listEnabledJoinUsers(page: Page): Promise<string[]> {
  const userOptions = await page.locator("select option").evaluateAll((options) =>
    options
      .map((option) => ({
        label: option.textContent?.trim() ?? "",
        disabled: option instanceof HTMLOptionElement ? option.disabled : false,
      }))
      .filter((option) => option.label.length > 0 && !option.disabled)
      .map((option) => option.label),
  );

  return userOptions;
}

async function tryJoinGameSession(
  page: Page,
  userName: string,
  password: string,
): Promise<boolean> {
  await page.locator("select").selectOption({ label: userName });
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: "Join Game Session" }).click();

  await page.waitForURL(/\/game$/, { timeout: 4000 }).catch(() => undefined);
  return /\/game$/.test(page.url());
}

async function closeBlockingWindows(page: Page) {
  for (let i = 0; i < 5; i++) {
    if (page.isClosed()) {
      return;
    }
    await page.keyboard.press("Escape").catch(() => undefined);
    await page.waitForTimeout(100).catch(() => undefined);
  }
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
    await loginToSetupIfNeeded(page, e2eConfig.foundryAdminPassword);

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

  const enabledUsers = await listEnabledJoinUsers(page);
  const configuredUser = enabledUsers.find(
    (candidate) => candidate.toLowerCase() === e2eConfig.GMUser.toLowerCase(),
  );
  if (!configuredUser) {
    throw new Error(
      `Configured E2E user "${e2eConfig.GMUser}" is not available on the join page. Available enabled users: ${enabledUsers.join(", ") || "<none>"}.`,
    );
  }

  const userCandidates = [configuredUser];
  const passwordCandidates = Array.from(
    new Set(["", e2eConfig.GMPassword, e2eConfig.foundryAdminPassword]).values(),
  ).filter((candidate): candidate is string => candidate != null);

  let joined = false;
  for (const userName of userCandidates) {
    for (const password of passwordCandidates) {
      if (await tryJoinGameSession(page, userName, password)) {
        joined = true;
        break;
      }
    }
    if (joined) {
      break;
    }
  }

  // Guard against delayed navigation where joining succeeded right after the last attempt returned.
  if (!joined) {
    await page.waitForURL(/\/game$/, { timeout: 2000 }).catch(() => undefined);
    joined = /\/game$/.test(page.url());
  }

  if (!joined) {
    throw new Error(
      `Foundry rejected E2E credentials for all attempted users (${userCandidates.join(", ") || "<none>"}). Update E2E_GM_USER and E2E_GM_PASSWORD in .env.local to match your world users.`,
    );
  }

  await page.waitForURL(/\/game$/, { timeout: 15000 });
  await page.waitForLoadState("networkidle");
  await dismissFoundryFirstRunUI(page);
  await closeBlockingWindows(page);

  return e2eConfig;
}
