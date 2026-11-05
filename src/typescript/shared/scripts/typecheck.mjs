import { spawnSync } from "node:child_process";

const checks = [
  {
    label: "app",
    args: ["./node_modules/typescript/bin/tsc", "-p", "tsconfig.json", "--noEmit"],
  },
  {
    label: "tests",
    args: ["./node_modules/typescript/bin/tsc", "-p", "tsconfig.test.json", "--noEmit"],
  },
  {
    label: "pulseUI",
    args: [
      "./src/pulseUI/node_modules/typescript/bin/tsc",
      "-p",
      "src/pulseUI/tsconfig.pulseUI.json",
      "--noEmit",
    ],
  },
];

function runTypeScriptCheck(label, args) {
  console.log(`Running TypeScript typecheck for ${label}...`);

  const result = spawnSync(process.execPath, args, {
    stdio: "inherit",
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
