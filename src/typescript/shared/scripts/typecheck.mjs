import { spawnSync } from "node:child_process";

const checks = [
  {
    label: "app",
    command: process.execPath,
    args: ["./node_modules/typescript/bin/tsc", "-p", "tsconfig.json", "--noEmit"],
  },
  {
    label: "tests",
    command: process.execPath,
    args: ["./node_modules/typescript/bin/tsc", "-p", "tsconfig.test.json", "--noEmit"],
  },
  {
    label: "pulseUI",
    command: process.execPath,
    args: [
      "./src/pulseUI/node_modules/typescript/bin/tsc",
      "-p",
      "src/pulseUI/tsconfig.pulseUI.json",
      "--noEmit",
    ],
  },
];

function runTypeScriptCheck(label, command, args) {
  console.log(`Running TypeScript typecheck for ${label}...`);

  const result = spawnSync(command, args, {
    stdio: "inherit",
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
