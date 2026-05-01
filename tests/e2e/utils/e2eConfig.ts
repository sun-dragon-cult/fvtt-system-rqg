import { loadEnvLocal } from "../../../utils.ts";

export type E2EConfig = {
  foundryWorld: string;
  foundryUser: string;
  foundryPassword: string;
  rqgActorName: string;
};

export async function getE2EConfig(): Promise<E2EConfig> {
  const localEnv = await loadEnvLocal();

  const foundryWorld =
    process.env.E2E_FOUNDRY_WORLD ?? localEnv["E2E_FOUNDRY_WORLD"] ?? "e2e-playwright";
  const foundryUser = process.env.E2E_FOUNDRY_USER ?? localEnv["E2E_FOUNDRY_USER"] ?? "gamemaster";
  const foundryPassword =
    process.env.E2E_FOUNDRY_PASSWORD ?? localEnv["E2E_FOUNDRY_PASSWORD"] ?? "123";
  const rqgActorName = process.env.E2E_RQG_ACTOR ?? localEnv["E2E_RQG_ACTOR"] ?? "Vasana";

  return {
    foundryWorld,
    foundryUser,
    foundryPassword,
    rqgActorName,
  };
}
