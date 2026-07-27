import { spawnSync } from "node:child_process";

const checks = [
  {
    label: "app",
    command: "tsc",
    args: ["-p", "tsconfig.json", "--noEmit"],
  },
  {
    label: "tests",
    command: "tsc",
    args: ["-p", "tsconfig.test.json", "--noEmit"],
  },
  {
    label: "pulseUI",
    command: "npm",
    args: ["--prefix", "src/pulseUI", "run", "typecheck"],
  },
];

function runTypeScriptCheck(label, command, args) {
  console.log(`Running TypeScript typecheck for ${label}...`);

  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: true,
  });

  if (result.status !== 0) {
    console.error(`FAIL: typecheck (${label})`);
    process.exit(result.status ?? 1);
  }
}

for (const check of checks) {
  runTypeScriptCheck(check.label, check.command, check.args);
}

console.log("PASS: typecheck");
