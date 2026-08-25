import { spawnSync } from "node:child_process";

const result = spawnSync(
  process.execPath,
  ["./node_modules/tsx/dist/cli.mjs", "src/typescript/shared/scripts/assistEvaluationCollect.ts"],
  { stdio: "inherit" },
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const pythonResult = spawnSync("py", ["-3.13", "src/python/retrieval/ragas_evaluation.py"], {
  stdio: "inherit",
});

if (pythonResult.status !== 0) {
  process.exit(pythonResult.status ?? 1);
}
