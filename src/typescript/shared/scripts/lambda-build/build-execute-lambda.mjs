import { mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

import { build } from "esbuild";
import { packageLambda } from "./package-lambda.mjs";

const outfile = resolve("dist/execute-lambda/index.js");

const stagingDirectory = resolve("dist/execute-lambda");
await rm(stagingDirectory, { force: true, recursive: true });
await mkdir(stagingDirectory, { recursive: true });

await build({
  entryPoints: [resolve("src/typescript/shared/scripts/execute-lambda/index.ts")],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  outfile,
  sourcemap: true,
  logLevel: "info",
});

await packageLambda("dist/execute-lambda", "dist/execute-lambda.zip");

