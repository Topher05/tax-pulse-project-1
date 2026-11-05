import { mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

import { build } from "esbuild";
import { packageLambda } from "./package-lambda.mjs";

const outfile = resolve("dist/issuer-metadata-lambda/index.js");
const stagingDirectory = resolve("dist/issuer-metadata-lambda");

await rm(stagingDirectory, { force: true, recursive: true });
await mkdir(stagingDirectory, { recursive: true });

await build({
  entryPoints: [resolve("src/typescript/shared/scripts/issuer-metadata-lambda/index.ts")],
  bundle: true,
  platform: "node",
  target: "node22",
  format: "cjs",
  outfile,
  sourcemap: true,
  logLevel: "info",
});

await packageLambda("dist/issuer-metadata-lambda", "dist/issuer-metadata-lambda.zip");
