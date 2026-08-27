import { z } from "zod";

export const assistTenantCorpusScopeValues = [
  "tenant-alpha",
  "tenant-beta",
  "tenant-shared",
] as const;

export type AssistTenantCorpusScope = (typeof assistTenantCorpusScopeValues)[number];

const mappedTenantScopeSchema = z.enum(["tenant-alpha", "tenant-beta"]);
const tenantIdSchema = z.uuid();

export class AssistTenantScopeConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssistTenantScopeConfigurationError";
  }
}

export class AssistTenantScopeUnavailableError extends Error {
  readonly tenantId: string;

  constructor(tenantId: string) {
    super(`No corpus tenant scope mapping is configured for tenant ${tenantId}.`);
    this.name = "AssistTenantScopeUnavailableError";
    this.tenantId = tenantId;
  }
}

export function allAssistTenantCorpusScopes(): readonly AssistTenantCorpusScope[] {
  return assistTenantCorpusScopeValues;
}

export function parseAssistTenantCorpusScopeMap(
  rawValue = process.env.ASSIST_TENANT_CORPUS_SCOPE_MAP,
): ReadonlyMap<string, AssistTenantCorpusScope> {
  const trimmed = rawValue?.trim();
  if (!trimmed) {
    throw new AssistTenantScopeConfigurationError(
      "ASSIST_TENANT_CORPUS_SCOPE_MAP must be a JSON object mapping tenant UUIDs to corpus scopes.",
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (error) {
    throw new AssistTenantScopeConfigurationError(
      `ASSIST_TENANT_CORPUS_SCOPE_MAP must be valid JSON: ${(error as Error).message}`,
    );
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new AssistTenantScopeConfigurationError(
      "ASSIST_TENANT_CORPUS_SCOPE_MAP must parse to a JSON object.",
    );
  }

  const entries = Object.entries(parsed);
  const result = new Map<string, AssistTenantCorpusScope>();

  for (const [tenantId, scope] of entries) {
    const parsedTenantId = tenantIdSchema.safeParse(tenantId);
    if (!parsedTenantId.success) {
      throw new AssistTenantScopeConfigurationError(
        `ASSIST_TENANT_CORPUS_SCOPE_MAP contains an invalid tenant UUID key: ${tenantId}.`,
      );
    }

    const parsedScope = mappedTenantScopeSchema.safeParse(scope);
    if (!parsedScope.success) {
      throw new AssistTenantScopeConfigurationError(
        `ASSIST_TENANT_CORPUS_SCOPE_MAP contains an unsupported scope for ${tenantId}.`,
      );
    }

    result.set(parsedTenantId.data, parsedScope.data);
  }

  return result;
}

export function resolveAssistTenantCorpusScopes(
  tenantScopeMap: ReadonlyMap<string, AssistTenantCorpusScope>,
  tenantId: string,
): readonly AssistTenantCorpusScope[] {
  const scope = tenantScopeMap.get(tenantId);
  if (scope === undefined) {
    throw new AssistTenantScopeUnavailableError(tenantId);
  }

  return scope === "tenant-shared" ? ["tenant-shared"] : [scope, "tenant-shared"];
}
