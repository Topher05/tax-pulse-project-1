import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

type Command = {
  command: string;
  args: string[];
};

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required for SPA deployment.`);
  }

  return value;
}

function run(command: Command, dryRun: boolean): void {
  const printable = [command.command, ...command.args].join(" ");

  if (dryRun) {
    console.log(printable);
    return;
  }

  const result = spawnSync(command.command, command.args, { stdio: "inherit" });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`Command failed with exit code ${result.status}: ${printable}`);
  }
}

const buildDirectory = process.env.TAXPULSE_SPA_BUILD_DIR?.trim() || "src/pulseUI/dist";
const bucketName = requiredEnv("TAXPULSE_SPA_BUCKET");
const distributionId = requiredEnv("TAXPULSE_CLOUDFRONT_DISTRIBUTION_ID");
const dryRun = process.env.TAXPULSE_SPA_DEPLOY_DRY_RUN === "true";

if (!existsSync(buildDirectory)) {
  throw new Error(`SPA build directory does not exist: ${buildDirectory}. Run npm run build:web first.`);
}

const commands: Command[] = [
  {
    command: "aws",
    args: [
      "s3",
      "sync",
      buildDirectory,
      `s3://${bucketName}`,
      "--delete",
      "--cache-control",
      "public,max-age=31536000,immutable",
      "--exclude",
      "index.html",
    ],
  },
  {
    command: "aws",
    args: [
      "s3",
      "cp",
      `${buildDirectory}/index.html`,
      `s3://${bucketName}/index.html`,
      "--cache-control",
      "no-cache,max-age=0,must-revalidate",
      "--content-type",
      "text/html",
    ],
  },
  {
    command: "aws",
    args: ["cloudfront", "create-invalidation", "--distribution-id", distributionId, "--paths", "/*"],
  },
];

for (const command of commands) {
  run(command, dryRun);
}
