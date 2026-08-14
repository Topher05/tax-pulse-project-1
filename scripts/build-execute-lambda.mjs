import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

import { build } from "esbuild";

const outfile = resolve("dist/execute-lambda/index.js");

await mkdir(resolve("dist/execute-lambda"), { recursive: true });

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
