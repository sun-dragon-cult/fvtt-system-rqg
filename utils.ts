import * as os from "os";
import * as fs from "fs/promises";

export async function findManifestJSON(packageType: string): Promise<string> {
  const manifestJSONPath = `${packageType}.json`;

  try {
    await fs.access(manifestJSONPath, fs.constants.F_OK);
    return manifestJSONPath;
  } catch {
    // Ignore error
  }

  const staticFile = `static/${packageType}.json`;
  try {
    await fs.access(staticFile, fs.constants.F_OK);
    return staticFile;
  } catch {
    // Ignore error
  }

  throw new Error(
    `Could not find manifest JSON at ${JSON.stringify(manifestJSONPath)} or ${JSON.stringify(staticFile)}`,
  );
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface ProcessEnv {
      FOUNDRY_DATA_PATH?: string;
      FOUNDRY_HOST_NAME?: string;
      FOUNDRY_PORT?: string;

      LOCALAPPDATA?: string;
      XDG_DATA_HOME?: string;
    }
  }
}

type HostData = {
  isWSLToWindows: boolean;
  isHostConfigured: boolean;
  host: string;
};

export async function findFoundryHost(): Promise<HostData> {
  const foundryHostNameEnv = process.env.FOUNDRY_HOST_NAME;
  const hasHostEnv = foundryHostNameEnv != null;
  const foundryHost = foundryHostNameEnv ?? "localhost";

  let foundryPort: number;
  const envPortString = process.env.FOUNDRY_PORT;

  const isHostConfigured = hasHostEnv || envPortString != null;

  if (envPortString != null) {
    if (!/[0-9]+/.test(envPortString)) {
      throw new Error(
        `Expected FOUNDRY_PORT to be a number, got ${JSON.stringify(envPortString)}.`,
      );
    }

    foundryPort = Number.parseInt(envPortString, 10);
  } else {
    foundryPort = 30013;
  }

  const pingResult = await ping(foundryHost, foundryPort);
  if (pingResult.error == null) {
    return { isWSLToWindows: false, isHostConfigured, host: pingResult.host };
  }

  const foundryNotRuning =
    "If Foundry is not running please start it. Otherwise if Foundry is running on a custom address set FOUNDRY_HOST_NAME and FOUNDRY_PORT.";

  // If the environment variable in WSL isn't set also try reaching the host through Windows.
  if (!hasHostEnv && (await isWSL())) {
    // The default host of localhost won't work on WSL if the server is running on Windows.
    // Reaching Windows is possible through `${hostname}.local`.
    const hostname = os.hostname();

    const wslToWindowsPingResult = await ping(`${hostname}.local`, foundryPort);
    if (wslToWindowsPingResult.error == null) {
      return {
        isWSLToWindows: true,
        isHostConfigured,
        host: wslToWindowsPingResult.host,
      };
    }

    throw new Error(
      `Could not ping localhost:${foundryHost} (WSL) or ${hostname}.local (Windows)
  ${foundryNotRuning}
  WSL Error - ${formatError(pingResult.error)}
  Windows Error - ${formatError(wslToWindowsPingResult.error)}`,
    );
  }

  throw new Error(
    `Could not ping localhost:${foundryHost}
  ${foundryNotRuning}
  Error: ${pingResult.error.message}`,
  );
}

type PingResult = { host: string; error?: never } | { host?: never; error: Error };

async function ping(hostName: string, port: number): Promise<PingResult> {
  if (!Number.isInteger(port)) {
    return {
      error: new Error(`Port must be a valid integer got ${port}`),
    };
  }

  if (port < 0 || port > 65535) {
    return {
      error: new Error(`Port must be between 0 and 65535, got ${port}`),
    };
  }

  const host = `${hostName}:${port}`;

  try {
    const response = await fetch(`http://${host}`, { method: "OPTION" });
    await response.body?.cancel("Body not needed");
  } catch (error) {
    return { error: toError(error) };
  }

  return { host: `${hostName}:${port}` };
}

// Since anything can be thrown, e.g `throw 1`, this function ensures it's an instance of `Error`.
function toError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  return new Error(formatError(error));
}

function formatError(error: unknown): string {
  if (!(error instanceof Error)) {
    // @ts-expect-error if `toString` fails there's nothing to do anyways

    return error.toString();
  }

  if (error.cause != null) {
    // If `toString` fails there's nothing to do anyways

    return `${error.toString()}, cause = ${error.cause.toString()}`;
  }

  return error.toString();
}

// A cached value of whether the current environment is WSL
let _isWSL: boolean | undefined = undefined;

async function isWSL(): Promise<boolean> {
  if (_isWSL != null) {
    return _isWSL;
  }

  // Checking for the WSLInterop file seems to be the way that the ecosystem has settled on to check if the system is running WSL.
  // See for example: https://github.com/canonical/snapd/blob/37eb0a311917af15622237db10011d9c62e8cb12/release/release.go#L151
  try {
    await fs.access("/proc/sys/fs/binfmt_misc/WSLInterop", fs.constants.F_OK);

    _isWSL = true;

    return _isWSL;
  } catch {
    // Ignore this error. It just means that the file doesn't exist but there's a fallback to check next.
  }

  try {
    await fs.access("/run/WSL", fs.constants.F_OK);

    _isWSL = true;
  } catch {
    _isWSL = false;
  }

  return _isWSL;
}
