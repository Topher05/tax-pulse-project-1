import { spawn } from "node:child_process";
import { access, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

import { chromium } from "playwright";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const viteCli = fileURLToPath(new URL("../node_modules/vite/bin/vite.js", import.meta.url));
const previewUrl = new URL("http://127.0.0.1:4173/");
const dashboardUrl = new URL("/", previewUrl);
const lighthouseScoreThreshold = 90;
const remoteDebuggingPort = 9222;
const syntheticAccessToken = `Bearer test-token`;
const pulseAccessTokenStorageKey = "taxpulse_shared_jwt";

async function main() {
  const lighthouseModule = await import("lighthouse");
  const lighthouse = lighthouseModule.default ?? lighthouseModule;
  const chromePath = await resolveChromeExecutablePath();
  const userDataDir = await mkdtemp(path.join(os.tmpdir(), "taxpulse-lighthouse-"));

  let previewProcess;
  let browserContext;

  try {
    await runNodeScript(viteCli, ["build", "--config", "vite.config.ts"]);
    previewProcess = spawnNodeScript(viteCli, [
      "preview",
      "--config",
      "vite.config.ts",
      "--host",
      "127.0.0.1",
      "--port",
      "4173",
      "--strictPort",
    ]);

    await waitForServer(previewUrl);

    browserContext = await chromium.launchPersistentContext(userDataDir, {
      executablePath: chromePath,
      headless: true,
      args: [
        `--remote-debugging-port=${remoteDebuggingPort}`,
        "--no-first-run",
        "--no-default-browser-check",
      ],
      viewport: {
        width: 1440,
        height: 900,
      },
    });

    await browserContext.addInitScript(
      ({ storageKey, accessToken }) => {
        localStorage.setItem(storageKey, accessToken);
      },
      {
        storageKey: pulseAccessTokenStorageKey,
        accessToken: syntheticAccessToken,
      },
    );

    const page = browserContext.pages()[0] ?? (await browserContext.newPage());
    await page.goto(dashboardUrl.toString(), {
      waitUntil: "networkidle",
    });

    const { lhr } = await lighthouse(dashboardUrl.toString(), {
      port: remoteDebuggingPort,
      logLevel: "error",
      onlyCategories: ["performance"],
      disableStorageReset: true,
    });

    const rawPerformanceScore = lhr.categories?.performance?.score;
    if (typeof rawPerformanceScore !== "number") {
      throw new Error("Lighthouse did not return a performance score.");
    }

    const performanceScore = Math.round(rawPerformanceScore * 100);
    console.log(`Lighthouse performance score: ${performanceScore}/100`);

    if (performanceScore < lighthouseScoreThreshold) {
      throw new Error(
        `Lighthouse performance score ${performanceScore} is below the minimum threshold of ${lighthouseScoreThreshold}.`,
      );
    }
  } finally {
    if (browserContext !== undefined) {
      await browserContext.close().catch(() => undefined);
    }

    if (previewProcess !== undefined) {
      previewProcess.kill();
      await waitForProcessExit(previewProcess);
    }

    await rm(userDataDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

async function runNodeScript(scriptPath, args) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      cwd: packageRoot,
      stdio: "inherit",
      env: process.env,
    });

    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolve(undefined);
        return;
      }

      reject(new Error(`Command ${path.basename(scriptPath)} ${args.join(" ")} failed with ${signal ?? code}.`));
    });
  });
}

function spawnNodeScript(scriptPath, args) {
  return spawn(process.execPath, [scriptPath, ...args], {
    cwd: packageRoot,
    stdio: "inherit",
    env: process.env,
  });
}

async function waitForServer(url) {
  const deadline = Date.now() + 120_000;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, {
        redirect: "manual",
      });

      if (response.ok || response.status === 302 || response.status === 304) {
        return;
      }
    } catch {
      // Keep waiting while the preview server is starting.
    }

    await delay(1000);
  }

  throw new Error(`Timed out waiting for the preview server at ${url.toString()}.`);
}

async function waitForProcessExit(childProcess) {
  if (childProcess.exitCode !== null || childProcess.signalCode !== null) {
    return;
  }

  await new Promise((resolve) => {
    childProcess.once("exit", () => {
      resolve(undefined);
    });
  });
}

async function resolveChromeExecutablePath() {
  const candidatePaths = [
    process.env.CHROME_PATH,
    process.env.CHROME_BIN,
  ].filter((candidate) => typeof candidate === "string" && candidate.length > 0);

  for (const candidatePath of candidatePaths) {
    try {
      await access(candidatePath);
      return candidatePath;
    } catch {
      continue;
    }
  }

  throw new Error(
    "Unable to find a Chrome executable. Set CHROME_PATH to a local Chrome install before running the Lighthouse gate.",
  );
}

await main();
