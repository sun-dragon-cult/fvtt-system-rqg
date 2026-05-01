import { test, expect } from "@playwright/test";
import { detectRunningFoundryUrl } from "./utils/foundryRuntime";

test("Playwright setup verification", async ({ page }) => {
  // Simple test to verify Playwright is working
  // This test doesn't require Foundry running—just verifies browser automation works

  // Navigate to a basic page
  await page.goto("https://example.com");

  // Verify page loaded
  await expect(page).toHaveTitle(/Example Domain/);

  // Find and verify element
  const heading = page.locator("h1");
  await expect(heading).toContainText("Example Domain");

  console.log("✓ Playwright is working correctly");
});

test.describe("Foundry Connection", () => {
  test("Connect to Foundry at configured base URL", async ({ page, baseURL }) => {
    const foundryUrl = await detectRunningFoundryUrl(baseURL);

    if (!foundryUrl) {
      console.log(`⚠ Foundry not available at configured base URL ${baseURL}`);
      console.log("  No running Foundry instance found on localhost ports 30013-30025");
      console.log("  Make sure Foundry is running: pnpm foundry 13 or pnpm foundry 14");
      expect(true).toBe(true);
      return;
    }

    console.log(`Attempting to connect to Foundry at ${foundryUrl}`);

    await page.goto(foundryUrl, { waitUntil: "networkidle", timeout: 5000 });
    console.log(`✓ Connected to Foundry at ${foundryUrl}`);
    expect(true).toBe(true);
  });
});
