/**
 * Create (or top up) the Playwright e2e world on a running Foundry server.
 *
 * Usage: pnpm test:e2e:create-world
 *
 * Idempotent: installs the wiki-en-rqg content module, creates the world, enables the module
 * and imports the test actors, skipping whatever is already in place. The world gets Foundry's
 * default "Gamemaster" user without a password, which matches the E2E_* defaults.
 */
import { chromium, type Page } from "@playwright/test";
import { getE2EConfig, type E2EConfig } from "../utils/e2eConfig.ts";
import { getFoundryBaseURL } from "../utils/foundryRuntime.ts";
import { loginToConfiguredWorld, loginToSetupIfNeeded } from "../utils/foundrySession.ts";

const CONTENT_MODULE_ID = "wiki-en-rqg";
const CONTENT_MODULE_MANIFEST =
  "https://github.com/sun-dragon-cult/fvtt-module-wiki-rqg/releases/latest/download/en-module.json";
const ADVENTURERS_PACK = `${CONTENT_MODULE_ID}.adventurers`;
// A second actor with hit locations is needed by actor-damage-heal.spec.ts.
const EXTRA_ACTOR_COUNT = 1;

type SetupResponse = { error?: string; [key: string]: unknown };

async function postSetup(
  page: Page,
  body: Record<string, unknown>,
  route = "/setup",
): Promise<SetupResponse> {
  return page.evaluate(
    async ({ requestBody, url }) => {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      const text = await response.text();
      try {
        return JSON.parse(text) as SetupResponse;
      } catch {
        return { error: `HTTP ${response.status}: ${text.slice(0, 200)}` };
      }
    },
    { requestBody: body, url: route },
  );
}

async function prepareSetup(page: Page, baseUrl: string, config: E2EConfig) {
  await page.goto(`${baseUrl}/setup`, { waitUntil: "networkidle" });
  await loginToSetupIfNeeded(page, config.foundryAdminPassword);
  if (!/\/setup/.test(page.url())) {
    throw new Error(
      `Expected the Foundry setup page but got ${page.url()}. Shut down any running world (or finish license activation) first.`,
    );
  }

  await page.waitForFunction(() => {
    const g = (globalThis as any).game;
    return g?.worlds != null && g?.modules != null;
  });
  return page.evaluate(
    ({ moduleId, worldId }) => {
      const g = game as any;
      return { hasModule: g.modules.has(moduleId), hasWorld: g.worlds.has(worldId) };
    },
    { moduleId: CONTENT_MODULE_ID, worldId: config.foundryWorld },
  );
}

async function main() {
  const baseUrl = await getFoundryBaseURL();
  const config = await getE2EConfig();
  const browser = await chromium.launch({ executablePath: config.chromiumExecutablePath });
  const page = await browser.newPage();

  try {
    const setup = await prepareSetup(page, baseUrl, config);

    if (!setup.hasModule) {
      console.log(`Installing module ${CONTENT_MODULE_ID}...`);
      const result = await postSetup(page, {
        action: "installPackage",
        type: "module",
        id: CONTENT_MODULE_ID,
        manifest: CONTENT_MODULE_MANIFEST,
      });
      if (result.error) {
        throw new Error(`Installing ${CONTENT_MODULE_ID} failed: ${result.error}`);
      }
    }

    if (!setup.hasWorld) {
      console.log(`Creating world ${config.foundryWorld}...`);
      const result = await postSetup(
        page,
        {
          action: "createWorld",
          id: config.foundryWorld,
          title: "RQG E2E (Playwright)",
          system: "rqg",
        },
        "/create",
      );
      if (result.error) {
        throw new Error(`Creating world ${config.foundryWorld} failed: ${result.error}`);
      }
    }

    await loginToConfiguredWorld(page, baseUrl);

    const moduleEnabled = await page.evaluate(async (moduleId) => {
      const g = game as any;
      const moduleConfig = { ...g.settings.get("core", "moduleConfiguration") };
      if (moduleConfig[moduleId]) {
        return true;
      }
      moduleConfig[moduleId] = true;
      await g.settings.set("core", "moduleConfiguration", moduleConfig);
      return false;
    }, CONTENT_MODULE_ID);

    if (!moduleEnabled) {
      console.log(`Enabled module ${CONTENT_MODULE_ID}, reloading world...`);
      await page.reload({ waitUntil: "networkidle" });
      await page.waitForFunction(() => (globalThis as any).game?.ready, null, {
        timeout: config.worldLoadTimeoutMs,
        polling: 500,
      });
    }

    const imported = await page.evaluate(
      async ({ packId, actorName, extraCount }) => {
        const g = game as any;
        const pack = g.packs.get(packId);
        if (!pack) {
          throw new Error(`Compendium ${packId} not found`);
        }
        const index = await pack.getIndex();
        const entries = [...index.values()] as { _id: string; name: string }[];
        const wanted = [
          entries.find((e) => e.name === actorName),
          ...entries.filter((e) => e.name !== actorName).slice(0, extraCount),
        ].filter((e) => e != null);
        if (!wanted.some((e) => e.name === actorName)) {
          throw new Error(`Actor ${actorName} not found in ${packId}`);
        }

        const names: string[] = [];
        for (const entry of wanted) {
          if (!g.actors.getName(entry.name)) {
            await g.actors.importFromCompendium(pack, entry._id);
            names.push(entry.name);
          }
        }
        return names;
      },
      { packId: ADVENTURERS_PACK, actorName: config.rqgActorName, extraCount: EXTRA_ACTOR_COUNT },
    );

    console.log(
      imported.length > 0
        ? `Imported actors: ${imported.join(", ")}`
        : "All test actors already present.",
    );
    console.log(`World ${config.foundryWorld} is ready for pnpm test:e2e.`);
  } finally {
    await browser.close();
  }
}

await main();
