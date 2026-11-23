import { describe, expect, it } from "vitest";
import {
  API_URL,
  compatibilityOf,
  registerRelease,
  RegisterError,
  type RegisterEnv,
} from "./register-foundry-release";

type Answer = [status: number, body: unknown, headers?: Record<string, string>];

type Scenario = {
  release?: { prerelease: boolean };
  manifest?: unknown;
  manifestAfter?: number;
  notes?: number;
  foundry?: Answer[];
};

const manifest = {
  id: "rqg",
  version: "7.1.0",
  compatibility: { minimum: "14.361", verified: 14 },
};
const published = { prerelease: false };

const baseEnv: RegisterEnv = {
  VERSION: "v7.1.0",
  DRY_RUN: "false",
  GITHUB_REPOSITORY: "sun-dragon-cult/fvtt-system-rqg",
  MANIFEST_FILE: "system.json",
  SYSTEM_NAME: "rqg",
  GITHUB_TOKEN: "gh",
  FOUNDRY_RELEASE_TOKEN: "fvttp_secret",
};

function respond(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (key: string) => headers[key] ?? null },
    json: async () => body,
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
  } as unknown as Response;
}

async function run(scenario: Scenario, env: RegisterEnv = {}) {
  const answers = [...(scenario.foundry ?? [[200, { status: "success" }]])];
  const posts: RequestInit[] = [];
  const logs: string[] = [];
  let manifestFetches = 0;
  const fetchStub = async (input: string | URL | Request, init: RequestInit = {}) => {
    const url = String(input);
    if (url.startsWith("https://api.github.com/")) {
      return scenario.release ? respond(200, scenario.release) : respond(404, {});
    }
    if (url.includes("/releases/download/")) {
      manifestFetches++;
      const ready = manifestFetches > (scenario.manifestAfter ?? 0);
      return scenario.manifest && ready ? respond(200, scenario.manifest) : respond(404, "");
    }
    if (url.startsWith("https://sun-dragon-cult.github.io/")) {
      return respond(scenario.notes ?? 200, "");
    }
    if (url === API_URL) {
      posts.push(init);
      const [status, body, headers] = (answers.length > 1 ? answers.shift() : answers[0])!;
      return respond(status, body, headers);
    }
    throw new Error(`unexpected fetch ${url}`);
  };
  let error: unknown;
  try {
    await registerRelease(
      { ...baseEnv, ...env },
      { fetch: fetchStub as typeof fetch, sleep: async () => {}, log: (m) => logs.push(m) },
    );
  } catch (e) {
    error = e;
  }
  const payload = posts[0] ? JSON.parse(String(posts[0].body)) : undefined;
  return { error, payload, posts, log: logs.join("\n"), manifestFetches };
}

describe("register-foundry-release", () => {
  it("registers the tag's manifest and notes with the raw token", async () => {
    const { error, payload, posts } = await run({ release: published, manifest });

    expect(error).toBeUndefined();
    expect(payload).toEqual({
      id: "rqg",
      release: {
        version: "7.1.0",
        manifest:
          "https://github.com/sun-dragon-cult/fvtt-system-rqg/releases/download/v7.1.0/system.json",
        notes: "https://sun-dragon-cult.github.io/release-notes/rqg-v7.1.0",
        compatibility: { minimum: "14.361", verified: "14" },
      },
    });
    expect((posts[0]!.headers as Record<string, string>)["Authorization"]).toBe("fvttp_secret");
  });

  it("leaves out compatibility the manifest doesn't state", () => {
    expect(compatibilityOf({ compatibility: { minimum: "14", maximum: "" } })).toEqual({
      minimum: "14",
    });
    expect(compatibilityOf({})).toEqual({});
  });

  it("lets a dry run use a pre-release", async () => {
    const { error, payload } = await run(
      { release: { prerelease: true }, manifest },
      { DRY_RUN: "true" },
    );
    expect(error).toBeUndefined();
    expect(payload["dry-run"]).toBe(true);
  });

  it("refuses to register a pre-release for real", async () => {
    const { error, posts } = await run({ release: { prerelease: true }, manifest });
    expect((error as Error).message).toContain("is a pre-release");
    expect(posts).toHaveLength(0);
  });

  it("fails when there is no published release, such as a draft", async () => {
    const { error } = await run({ manifest });
    expect(error).toBeInstanceOf(RegisterError);
    expect((error as Error).message).toContain("No published GitHub release for tag v7.1.0");
  });

  it("waits for the manifest while the release is being built", async () => {
    const { error, manifestFetches } = await run(
      { release: published, manifest, manifestAfter: 3 },
      { MANIFEST_WAIT_MINUTES: "20" },
    );
    expect(error).toBeUndefined();
    expect(manifestFetches).toBe(4);
  });

  it("tries the manifest once without a wait and fails when it's missing", async () => {
    const { error, manifestFetches } = await run({ release: published });
    expect((error as Error).message).toContain("is not available: HTTP 404");
    expect(manifestFetches).toBe(1);
  });

  it("fails when the manifest version isn't the tag's", async () => {
    const { error } = await run({
      release: published,
      manifest: { ...manifest, version: "7.0.9" },
    });
    expect((error as Error).message).toContain("has version 7.0.9, not 7.1.0");
  });

  it("warns when the release notes aren't live and still registers", async () => {
    const { error, log, posts } = await run({ release: published, manifest, notes: 404 });
    expect(error).toBeUndefined();
    expect(log).toContain("release notes are not live");
    expect(posts).toHaveLength(1);
  });

  it("treats an already registered version as a warning", async () => {
    const duplicate: Answer = [
      400,
      { status: "error", errors: { __all__: [{ code: "unique_together", message: "exists" }] } },
    ];
    const real = await run({ release: published, manifest, foundry: [duplicate] });
    expect(real.error).toBeUndefined();
    expect(real.log).toContain("already registered with Foundry.");

    const dry = await run(
      { release: published, manifest, foundry: [duplicate] },
      { DRY_RUN: "true" },
    );
    expect(dry.error).toBeUndefined();
    expect(dry.log).toContain("so the dry run stopped there");
  });

  it("fails when Foundry rejects the release", async () => {
    const { error } = await run({
      release: published,
      manifest,
      foundry: [[400, { status: "error", errors: { "release.manifest": [{ code: "invalid" }] } }]],
    });
    expect((error as Error).message).toBe("Foundry rejected the release (HTTP 400).");
  });

  it("tries again once after being rate limited", async () => {
    const { error, posts } = await run({
      release: published,
      manifest,
      foundry: [
        [429, "slow down", { "Retry-After": "5" }],
        [200, { status: "success" }],
      ],
    });
    expect(error).toBeUndefined();
    expect(posts).toHaveLength(2);
  });

  it("fails clearly on an answer that isn't JSON", async () => {
    const { error } = await run({
      release: published,
      manifest,
      foundry: [[502, "<html>Bad Gateway</html>"]],
    });
    expect((error as Error).message).toContain("with no JSON");
  });

  it("fails without a token or a version", async () => {
    expect((await run({}, { FOUNDRY_RELEASE_TOKEN: "" })).error).toBeInstanceOf(RegisterError);
    expect(((await run({}, { VERSION: "" })).error as Error).message).toBe(
      "No version to register.",
    );
  });
});
