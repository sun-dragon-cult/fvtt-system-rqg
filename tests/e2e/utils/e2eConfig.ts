import { loadEnvLocal } from "../../../utils.ts";

const DEFAULT_WORLD_LOAD_TIMEOUT_MS = 120_000;

export type E2EConfig = {
  foundryWorld: string;
  GMUser: string;
  GMPassword: string;
  foundryAdminPassword: string | null;
  rqgActorName: string;
  /** How long to wait for Foundry pages and the world to load, in ms. */
  worldLoadTimeoutMs: number;
  /** Chromium binary to use instead of Playwright's own download. */
  chromiumExecutablePath: string | undefined;
};

export async function getE2EConfig(): Promise<E2EConfig> {
  const localEnv = await loadEnvLocal();

  const foundryWorld =
    process.env.E2E_FOUNDRY_WORLD ?? localEnv["E2E_FOUNDRY_WORLD"] ?? "e2e-playwright";
  const GMUser = process.env.E2E_GM_USER ?? localEnv["E2E_GM_USER"] ?? "gamemaster";
  const GMPassword = process.env.E2E_GM_PASSWORD ?? localEnv["E2E_GM_PASSWORD"] ?? "123";
  const foundryAdminPassword =
    process.env.E2E_FOUNDRY_ADMIN_PASSWORD ?? localEnv["E2E_FOUNDRY_ADMIN_PASSWORD"] ?? GMPassword;
  const rqgActorName = process.env.E2E_RQG_ACTOR ?? localEnv["E2E_RQG_ACTOR"] ?? "Vasana";

  const timeoutSetting = Number(
    process.env.E2E_WORLD_LOAD_TIMEOUT ??
      localEnv["E2E_WORLD_LOAD_TIMEOUT"] ??
      DEFAULT_WORLD_LOAD_TIMEOUT_MS,
  );
  const worldLoadTimeoutMs =
    Number.isFinite(timeoutSetting) && timeoutSetting > 0
      ? timeoutSetting
      : DEFAULT_WORLD_LOAD_TIMEOUT_MS;

  const chromiumExecutablePath =
    process.env.E2E_CHROMIUM_PATH || localEnv["E2E_CHROMIUM_PATH"] || undefined;

  return {
    foundryWorld,
    GMUser,
    GMPassword,
    foundryAdminPassword,
    rqgActorName,
    worldLoadTimeoutMs,
    chromiumExecutablePath,
  };
}
