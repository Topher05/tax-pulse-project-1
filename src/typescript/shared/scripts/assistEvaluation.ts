import { spawnSync } from "node:child_process";
import { config as loadEnv } from "dotenv";

loadEnv();

const collectResult = spawnSync(
  process.execPath,
  ["./node_modules/tsx/dist/cli.mjs", "src/typescript/shared/scripts/assistEvaluationCollect.ts"],
  { stdio: "inherit" },
);

if (collectResult.status !== 0) {
  fail("collect", collectResult.status, collectResult.signal);
}

const scoreCommand = {
  command: "uv",
  args: [
    "run",
    "--locked",
    "--extra",
    "eval",
    "python",
    "src/python/retrieval/ragas_evaluation.py",
  ],
};

const scoreResult = spawnSync(scoreCommand.command, scoreCommand.args, {
  stdio: "inherit",
});

if (scoreResult.status !== 0) {
  fail("score", scoreResult.status, scoreResult.signal);
}

function fail(
  stage: "collect" | "score",
  status: number | null,
  signal: NodeJS.Signals | null,
): never {
  if (status === null) {
    throw new Error(
      `assist:evaluation ${stage} stage failed before completion${
        signal ? ` with signal ${signal}` : ""
      }.`,
    );
  }

  process.exit(status);
  throw new Error(`assist:evaluation ${stage} stage exited with ${status}.`);
}
