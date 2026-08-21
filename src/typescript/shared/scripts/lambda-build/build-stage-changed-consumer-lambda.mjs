import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

import { build } from "esbuild";

const outfile = resolve("dist/stage-changed-consumer/index.js");

await mkdir(resolve("dist/stage-changed-consumer"), { recursive: true });

await build({
  entryPoints: [resolve("src/typescript/features/taxPlanCycle/infrastructure/cloudEvents/stageChanged/LambdaHandler.ts")],
  bundle: true,
  platform: "node",
  target: "node22",
  format: "cjs",
  outfile,
  sourcemap: true,
  logLevel: "info",
});
