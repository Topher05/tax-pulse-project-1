import { spawnSync } from "node:child_process";

const checks = [
  {
    label: "app",
    args: ["-p", "tsconfig.json", "--noEmit"],
  },
  {
    label: "tests",
    args: ["-p", "tsconfig.test.json", "--noEmit"],
  },
];

function runTypeScriptCheck(label, args) {
  console.log(`Running TypeScript typecheck for ${label}...`);

  const result = spawnSync("tsc", args, {
    stdio: "inherit",
    shell: true,
  });

  if (result.status !== 0) {
    console.error(`FAIL: typecheck (${label})`);
    process.exit(result.status ?? 1);
  }
}

for (const check of checks) {
  runTypeScriptCheck(check.label, check.args);
}

console.log("PASS: typecheck");
