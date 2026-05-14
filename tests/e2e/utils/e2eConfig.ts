import { loadEnvLocal } from "../../../utils.ts";

export type E2EConfig = {
  foundryWorld: string;
  GMUser: string;
  GMPassword: string;
  foundryAdminPassword: string | null;
  rqgActorName: string;
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

  return {
    foundryWorld,
    GMUser,
    GMPassword,
    foundryAdminPassword,
    rqgActorName,
  };
}
