import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

import { build } from "esbuild";

const outfile = resolve("dist/issuer-metadata-lambda/index.js");

await mkdir(resolve("dist/issuer-metadata-lambda"), { recursive: true });

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
