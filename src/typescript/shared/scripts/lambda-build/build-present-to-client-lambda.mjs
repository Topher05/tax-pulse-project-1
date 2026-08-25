import { mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

import { build } from "esbuild";
import { packageLambda } from "./package-lambda.mjs";

const outfile = resolve("dist/present-to-client-lambda/index.js");

const stagingDirectory = resolve("dist/present-to-client-lambda");
await rm(stagingDirectory, { force: true, recursive: true });
await mkdir(stagingDirectory, { recursive: true });

await build({
  entryPoints: [resolve("src/typescript/shared/scripts/present-to-client-lambda/index.ts")],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  outfile,
  sourcemap: true,
  logLevel: "info",
});

await packageLambda("dist/present-to-client-lambda", "dist/present-to-client-lambda.zip");

