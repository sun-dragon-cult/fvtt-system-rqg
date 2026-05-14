/// <reference types="node" />
import { defineConfig, devices } from "@playwright/test";
import { getFoundryBaseURL } from "./tests/e2e/utils/foundryRuntime.ts";
import process from "node:process";

export default (async () => {
  const FOUNDRY_BASE_URL = await getFoundryBaseURL();

  return defineConfig({
    testDir: "./tests/e2e",
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : Number(process.env.E2E_WORKERS ?? 1),
    reporter: "html",
    use: {
      baseURL: FOUNDRY_BASE_URL,
      trace: "on-first-retry",
      screenshot: "only-on-failure",
    },

    projects: [
      {
        name: "chromium",
        use: {
          ...devices["Desktop Chrome"],
          viewport: { width: 1400, height: 800 },
        },
      },
    ],

    webServer: {
      command: `echo "Playwright ready. Foundry base URL: ${FOUNDRY_BASE_URL}"`,
      reuseExistingServer: true,
    },
  });
})();
