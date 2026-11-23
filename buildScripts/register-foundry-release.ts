import process from "process";
import { pathToFileURL } from "url";

/**
 * Register a published GitHub release with the Foundry Package Release API
 * (https://foundryvtt.com/article/package-release-api/), from the manifest attached to the release.
 *
 *   node buildScripts/register-foundry-release.ts
 *
 * Reads VERSION, DRY_RUN, FOUNDRY_RELEASE_TOKEN, GITHUB_TOKEN, GITHUB_REPOSITORY, MANIFEST_FILE,
 * SYSTEM_NAME and MANIFEST_WAIT_MINUTES from the environment.
 */

export const API_URL = "https://foundryvtt.com/_api/packages/release_version/";

export type RegisterEnv = Record<string, string | undefined>;

export type RegisterDeps = {
  fetch: typeof fetch;
  sleep: (ms: number) => Promise<void>;
  log: (message: string) => void;
};

type Manifest = {
  id?: string;
  version?: string;
  compatibility?: { minimum?: unknown; verified?: unknown; maximum?: unknown };
};

type FoundryAnswer = {
  status?: string;
  errors?: Record<string, { code?: string; message?: string }[] | undefined>;
};

export class RegisterError extends Error {}

const MANIFEST_POLL_MS = 30_000;

/** The compatibility to register, leaving out what the manifest doesn't state. */
export function compatibilityOf(manifest: Manifest): Record<string, string> {
  return Object.fromEntries(
    (["minimum", "verified", "maximum"] as const)
      .map((key) => [key, manifest.compatibility?.[key]] as const)
      .filter(([, value]) => value != null && value !== "")
      .map(([key, value]) => [key, String(value)]),
  );
}

/** Foundry refuses a version it already has with a `unique_together` error (see the API article). */
export function isAlreadyRegistered(answer: FoundryAnswer): boolean {
  return !!answer.errors?.["__all__"]?.some((e) => e.code === "unique_together");
}

export async function registerRelease(env: RegisterEnv, deps: RegisterDeps): Promise<void> {
  const version = (env["VERSION"] ?? "").trim().replace(/^v/, "");
  const dryRun = env["DRY_RUN"] === "true";
  if (!version) {
    throw new RegisterError("No version to register.");
  }
  const token = env["FOUNDRY_RELEASE_TOKEN"];
  if (!token) {
    throw new RegisterError(
      "The FOUNDRY_RELEASE_TOKEN secret is not set (see Releasing in the README).",
    );
  }
  const repository = env["GITHUB_REPOSITORY"];
  const manifestUrl = `https://github.com/${repository}/releases/download/v${version}/${env["MANIFEST_FILE"]}`;
  const notesUrl = `https://sun-dragon-cult.github.io/release-notes/${env["SYSTEM_NAME"]}-v${version}`;

  // The tags endpoint doesn't return drafts
  const github = await deps.fetch(
    `https://api.github.com/repos/${repository}/releases/tags/v${version}`,
    {
      headers: {
        Authorization: `Bearer ${env["GITHUB_TOKEN"]}`,
        Accept: "application/vnd.github+json",
      },
    },
  );
  if (!github.ok) {
    throw new RegisterError(
      `No published GitHub release for tag v${version} (HTTP ${github.status}). A draft has to be published first.`,
    );
  }
  const release = (await github.json()) as { prerelease?: boolean };
  if (!dryRun && release.prerelease) {
    throw new RegisterError(`v${version} is a pre-release: promote it before registering.`);
  }

  const manifest = await fetchManifest(manifestUrl, env, deps);
  if (manifest.version !== version) {
    throw new RegisterError(`${manifestUrl} has version ${manifest.version}, not ${version}.`);
  }

  const notes = await deps.fetch(notesUrl, { method: "HEAD" }).catch(() => undefined);
  if (!notes?.ok) {
    deps.log(`::warning::The release notes are not live yet: ${notesUrl}`);
  }

  const payload = {
    id: manifest.id,
    ...(dryRun ? { "dry-run": true } : {}),
    release: {
      version,
      manifest: manifestUrl,
      notes: notesUrl,
      compatibility: compatibilityOf(manifest),
    },
  };
  deps.log(`Sending payload: ${JSON.stringify(payload, null, 2)}`);

  const post = () =>
    deps.fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
      body: JSON.stringify(payload),
    });
  let response = await post();
  if (response.status === 429) {
    const wait = Math.min(Number(response.headers.get("Retry-After")) || 60, 120);
    deps.log(`Rate limited, trying again in ${wait} s`);
    await deps.sleep(wait * 1000);
    response = await post();
  }

  const text = await response.text();
  let answer: FoundryAnswer;
  try {
    answer = JSON.parse(text) as FoundryAnswer;
  } catch {
    throw new RegisterError(
      `Foundry answered HTTP ${response.status} with no JSON: ${text.slice(0, 300)}`,
    );
  }
  deps.log(`Foundry API response: ${JSON.stringify(answer, null, 2)}`);
  if (response.ok && answer.status === "success") {
    return;
  }
  if (isAlreadyRegistered(answer)) {
    deps.log(
      dryRun
        ? `::warning::Version ${version} is already registered with Foundry, so the dry run stopped there.`
        : `::warning::Version ${version} is already registered with Foundry.`,
    );
    return;
  }
  throw new RegisterError(`Foundry rejected the release (HTTP ${response.status}).`);
}

/** Polls, since a release published straight as a full release is registered while it's built. */
async function fetchManifest(url: string, env: RegisterEnv, deps: RegisterDeps): Promise<Manifest> {
  const attempts = Math.max(
    1,
    Math.ceil((Number(env["MANIFEST_WAIT_MINUTES"]) || 0) * (60_000 / MANIFEST_POLL_MS)),
  );
  let last = "";
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await deps.fetch(url);
      if (response.ok) {
        return (await response.json()) as Manifest;
      }
      last = `HTTP ${response.status}`;
    } catch (error) {
      last = String(error);
    }
    if (attempt < attempts) {
      deps.log(`${url} is not available yet (${last}), trying again`);
      await deps.sleep(MANIFEST_POLL_MS);
    }
  }
  throw new RegisterError(`${url} is not available: ${last}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  registerRelease(process.env, {
    fetch,
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    log: (message) => console.log(message),
  }).catch((error: unknown) => {
    console.log(`::error::${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}
