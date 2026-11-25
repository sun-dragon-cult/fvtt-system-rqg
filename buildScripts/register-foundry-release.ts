import process from "process";
import { pathToFileURL } from "url";

/**
 * Register a published GitHub release with the Foundry Package Release API
 * (https://foundryvtt.com/article/package-release-api/), from the manifest attached to the release.
 *
 *   node buildScripts/register-foundry-release.ts
 *
 * Reads TAG, DRY_RUN, TRIGGER, FOUNDRY_RELEASE_TOKEN, GITHUB_TOKEN, GITHUB_REPOSITORY,
 * MANIFEST_FILE and SYSTEM_NAME from the environment. TRIGGER is the release event's action
 * ("published" after the build, "released" on promotion) or "manual".
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

type GitHubRelease = {
  prerelease?: boolean;
  assets?: { name?: string; state?: string }[];
};

type FoundryAnswer = {
  status?: string;
  errors?: Record<string, { code?: string; message?: string }[] | undefined>;
};

export class RegisterError extends Error {}

const ASSET_POLL_MS = 10_000;
const ASSET_POLL_ATTEMPTS = 6;

/** The API article's payload always has a maximum, "" when there is none. */
export function compatibilityOf(manifest: Manifest): Record<string, string> {
  const stated = Object.entries(manifest.compatibility ?? {}).filter(
    ([, value]) => value != null && value !== "",
  );
  return { maximum: "", ...Object.fromEntries(stated.map(([k, v]) => [k, String(v)])) };
}

/** Foundry refuses a version it already has with a `unique_together` error (see the API article). */
function isAlreadyRegistered(answer: FoundryAnswer): boolean {
  return !!answer.errors?.["__all__"]?.some((e) => e.code === "unique_together");
}

export async function registerRelease(env: RegisterEnv, deps: RegisterDeps): Promise<void> {
  const version = /^v(\d+\.\d+\.\d+(?:-[\w.]+)?)$/.exec(env["TAG"] ?? "")?.[1];
  const dryRun = env["DRY_RUN"] === "true";
  const trigger = env["TRIGGER"] || "manual";
  const systemName = env["SYSTEM_NAME"];
  const manifestFile = env["MANIFEST_FILE"];
  if (!version) {
    throw new RegisterError(`"${env["TAG"] ?? ""}" is not a release tag like v7.1.0.`);
  }
  const token = env["FOUNDRY_RELEASE_TOKEN"];
  if (!token) {
    throw new RegisterError(
      "The FOUNDRY_RELEASE_TOKEN secret is not set (see Releasing in the README).",
    );
  }
  const repository = env["GITHUB_REPOSITORY"];
  const manifestUrl = `https://github.com/${repository}/releases/download/v${version}/${manifestFile}`;
  const notesUrl = `https://sun-dragon-cult.github.io/release-notes/${systemName}-v${version}`;

  // The tags endpoint doesn't return drafts
  const readRelease = async (): Promise<GitHubRelease> => {
    const github = await deps.fetch(
      `https://api.github.com/repos/${repository}/releases/tags/v${version}`,
      {
        headers: {
          Authorization: `Bearer ${env["GITHUB_TOKEN"]}`,
          Accept: "application/vnd.github+json",
        },
      },
    );
    if (github.status === 404) {
      throw new RegisterError(
        `No published GitHub release for tag v${version}. A draft has to be published first.`,
      );
    }
    if (!github.ok) {
      throw new RegisterError(
        `GitHub answered HTTP ${github.status} when reading the release for tag v${version}.`,
      );
    }
    return (await github.json()) as GitHubRelease;
  };
  const missingAssets = (release: GitHubRelease) =>
    [manifestFile, `${systemName}.zip`].filter(
      (name) => !release.assets?.some((a) => a.name === name && a.state === "uploaded"),
    );

  let release = await readRelease();
  let missing = missingAssets(release);
  // Right after the build's upload, the API can still show the files as not uploaded
  for (
    let attempt = 1;
    trigger === "published" && missing.length && attempt < ASSET_POLL_ATTEMPTS;
    attempt++
  ) {
    deps.log(`The release doesn't show ${missing.join(", ")} yet, trying again`);
    await deps.sleep(ASSET_POLL_MS);
    release = await readRelease();
    missing = missingAssets(release);
  }

  if (!dryRun && release.prerelease) {
    if (trigger !== "manual") {
      deps.log(`v${version} is a pre-release, so it is registered when it is promoted.`);
      return;
    }
    throw new RegisterError(`v${version} is a pre-release: promote it before registering.`);
  }

  if (missing.length) {
    if (trigger === "released") {
      // Published straight as a full release: the build run registers it once its files are attached
      deps.log(
        `v${version} is still being built (no ${missing.join(", ")}), so the build registers it.`,
      );
      return;
    }
    throw new RegisterError(`The release v${version} has no ${missing.join(", ")} attached.`);
  }

  const [manifestResponse, notes] = await Promise.all([
    deps.fetch(manifestUrl),
    deps.fetch(notesUrl, { method: "HEAD" }).catch(() => undefined),
  ]);
  if (!manifestResponse.ok) {
    throw new RegisterError(`${manifestUrl} is not available: HTTP ${manifestResponse.status}`);
  }
  const manifest = (await manifestResponse.json()) as Manifest;
  if (manifest.id !== systemName) {
    throw new RegisterError(`${manifestUrl} has id ${manifest.id}, not ${systemName}.`);
  }
  if (manifest.version !== version) {
    throw new RegisterError(`${manifestUrl} has version ${manifest.version}, not ${version}.`);
  }

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
      `::warning::Version ${version} is already registered with Foundry${dryRun ? ", so the dry run stopped there" : ""}.`,
    );
    return;
  }
  throw new RegisterError(`Foundry rejected the release (HTTP ${response.status}).`);
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
