import { randomBytes } from "node:crypto";

import { argon2id, hash, verify } from "argon2";

export interface PasswordHashingConfig {
  memoryCostKiB: number;
  timeCost: number;
  parallelism: number;
  hashLength: number;
  saltLength: number;
}

export type PasswordHashingConfigOverrides = Partial<PasswordHashingConfig>;

export interface HashPasswordOptions {
  config?: PasswordHashingConfigOverrides;
  env?: NodeJS.ProcessEnv;
}

export const defaultPasswordHashingConfig: Readonly<PasswordHashingConfig> = {
  memoryCostKiB: 65_536,
  timeCost: 3,
  parallelism: 4,
  hashLength: 32,
  saltLength: 16,
};

const envMappings = [
  ["TAXPULSE_ARGON2_MEMORY_COST_KIB", "memoryCostKiB"],
  ["TAXPULSE_ARGON2_TIME_COST", "timeCost"],
  ["TAXPULSE_ARGON2_PARALLELISM", "parallelism"],
  ["TAXPULSE_ARGON2_HASH_LENGTH", "hashLength"],
  ["TAXPULSE_ARGON2_SALT_LENGTH", "saltLength"],
] as const satisfies readonly [
  string,
  keyof PasswordHashingConfig,
][];

export function resolvePasswordHashingConfig(
  env: NodeJS.ProcessEnv = process.env,
): PasswordHashingConfig {
  const config: PasswordHashingConfig = { ...defaultPasswordHashingConfig };

  for (const [envName, configKey] of envMappings) {
    const rawValue = env[envName]?.trim();

    if (!rawValue) {
      continue;
    }

    config[configKey] = parsePositiveInteger(rawValue, envName);
  }

  return config;
}

export async function hashPassword(
  plaintextPassword: string,
  options: HashPasswordOptions = {},
): Promise<string> {
  const config = {
    ...resolvePasswordHashingConfig(options.env),
    ...options.config,
  };

  validatePasswordHashingConfig(config);

  return await hash(plaintextPassword, {
    type: argon2id,
    memoryCost: config.memoryCostKiB,
    timeCost: config.timeCost,
    parallelism: config.parallelism,
    hashLength: config.hashLength,
    salt: randomBytes(config.saltLength),
  });
}

export async function verifyPasswordHash(
  passwordHash: string,
  plaintextPassword: string,
): Promise<boolean> {
  try {
    return await verify(passwordHash, plaintextPassword);
  } catch {
    return false;
  }
}

function validatePasswordHashingConfig(config: PasswordHashingConfig): void {
  for (const [configKey, value] of Object.entries(config)) {
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error(`${configKey} must be a positive integer.`);
    }
  }
}

function parsePositiveInteger(rawValue: string, envName: string): number {
  const parsedValue = Number(rawValue);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(`${envName} must be a positive integer.`);
  }

  return parsedValue;
}
