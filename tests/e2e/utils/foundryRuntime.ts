import { loadEnvLocal } from "../../../utils.ts";

export async function getFoundryBaseURL(): Promise<string> {
  const localEnv = await loadEnvLocal();

  const foundryHostNameEnv = process.env.FOUNDRY_HOST_NAME ?? localEnv["FOUNDRY_HOST_NAME"];
  const foundryHost = foundryHostNameEnv ?? "localhost";

  const envPortString = process.env.FOUNDRY_PORT ?? localEnv["FOUNDRY_PORT"];
  const foundryPort = envPortString ?? "30014";

  return `http://${foundryHost}:${foundryPort}`;
}

export async function detectRunningFoundryUrl(configuredBaseUrl?: string): Promise<string | null> {
  const candidateUrls = new Set<string>();

  if (configuredBaseUrl) {
    candidateUrls.add(configuredBaseUrl);
  }

  for (let port = 30013; port <= 30025; port += 1) {
    candidateUrls.add(`http://localhost:${port}`);
  }

  for (const url of candidateUrls) {
    try {
      const response = await fetch(url, { method: "GET" });
      await response.body?.cancel();
      return url;
    } catch {
      // Try the next candidate URL.
    }
  }

  return null;
}
