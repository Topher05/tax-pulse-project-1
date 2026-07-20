import { fileURLToPath } from "node:url";
import type { Server } from "node:http";

export {
  clientIncomeDeductionAggregationPayloadSchema,
  deductionSchema,
  incomeEventSchema,
  type ClientIncomeDeductionAggregationPayload,
  type Deduction,
  type IncomeEvent,
} from "./aggregationPayload.js";
export {
  AggregationTimeoutError,
  TaxPulseAggregationClient,
  type AggregationDataSource,
  type TaxPulseAggregationClientOptions,
} from "./aggregationClient.js";
export { InMemoryMockAggregationDataSource } from "./mockAggregationDataSource.js";
export { createApp, type CreateAppOptions } from "./app.js";
export {
  ProblemHttpError,
  problemDetailsMiddleware,
  type ProblemDetails,
  type ProblemHttpErrorOptions,
} from "./errors.js";
export {
  createLogger,
  createRequestLogger,
  type CreateLoggerOptions,
} from "./logger.js";
export {
  defaultPasswordHashingConfig,
  hashPassword,
  resolvePasswordHashingConfig,
  verifyPasswordHash,
  type HashPasswordOptions,
  type PasswordHashingConfig,
  type PasswordHashingConfigOverrides,
} from "./passwordHashing.js";
export {
  type InvalidPasswordCredentialResult,
  type MfaChallengeRequiredResult,
  type PasswordAuthenticationResult,
  type PasswordCredentialLoginInput,
  type PasswordCredentialLoginRecord,
  type PasswordCredentialLookupInput,
  type PasswordCredentialReader,
  type PasswordCredentialRegistrationInput,
  type PasswordCredentialStore,
  type PasswordCredentialWriter,
  type StoredPasswordCredential,
} from "./authModel.js";
export {
  authenticatePasswordForMfaChallenge,
  registerPasswordCredential,
} from "./authService.js";
export { createPasswordCredentialStore } from "./authCredentials.js";
export {
  authMfaLoginRequestSchema,
  authMfaLoginResultSchema,
  createAuthMfaLoginController,
  type AuthMfaLoginController,
  type AuthMfaLoginRequest,
  type AuthMfaLoginResult,
  type CreateAuthMfaLoginControllerOptions,
} from "./authMfaLogin.js";
export {
  createAuthMfaLoginRouter,
  type AuthMfaValidationErrorIssue,
  type AuthMfaValidationErrorResponse,
  type CreateAuthMfaLoginRouterOptions,
} from "./authMfaLoginRoutes.js";
export {
  createAuthRouter,
  passwordLoginRequestSchema,
  type AuthValidationErrorIssue,
  type AuthValidationErrorResponse,
  type CreateAuthRouterOptions,
  type MfaChallengeResponse,
  type PasswordAuthenticator,
  type PasswordLoginRequest,
} from "./authRoutes.js";
export {
  coreCaseOpenApiSchemaRegistrations,
  createCoreCaseOpenApiDocument,
  type CoreCaseOpenApiSchemaRegistration,
} from "./coreCaseOpenApi.js";
export { createCoreCaseOpenApiRouter } from "./coreCaseOpenApiRoutes.js";
export {
  auditEntry,
  credential,
  mfaEnrollment,
  refreshToken,
  roles,
  stageTransition,
  taxPlanCycle,
  tenants,
  users,
  userStatus,
} from "./db/schema.js";
export { getJwtConfigFromEnv, type JwtConfig } from "./authConfig.js";
export {
  createJwtAuthenticationMiddleware,
  type CreateJwtAuthenticationMiddlewareOptions,
} from "./jwtAuthentication.js";
export {
  TAXPULSE_COST_UNITS_HEADER,
  createCostAccountingMiddleware,
  defaultCostUnitResolver,
  type CostAccountingRequest,
  type CostUnitResolver,
  type CreateCostAccountingMiddlewareOptions,
} from "./costAccounting.js";
export {
  createTenantRateLimitMiddleware,
  type CreateTenantRateLimitMiddlewareOptions,
  type TenantRateLimitBucket,
  type TenantRateLimitStore,
} from "./tenantRateLimiting.js";
export {
  type AccessTokenClaims,
  type AuthenticatedPrincipal,
  type IssuedTokenPair,
  type UserRole,
} from "./authTypes.js";
export {
  createRefreshTokenRepository,
  type PersistRefreshTokenInput,
  type RefreshTokenRepository,
  type RevokeRefreshTokenByHashInput,
} from "./refreshTokenRepository.js";
export {
  createTokenService,
  type CreateTokenServiceOptions,
  type TokenService,
} from "./tokenService.js";
export {
  createDefaultMfaTotpProvider,
  createMfaEnrollmentController,
  mfaEnrollConfirmRequestSchema,
  mfaEnrollConfirmResultSchema,
  mfaEnrollRequestSchema,
  mfaEnrollResultSchema,
  type CreateMfaEnrollmentControllerOptions,
  type MfaEnrollmentController,
  type MfaEnrollmentRecord,
  type MfaEnrollmentRepository,
  type MfaEnrollConfirmRequest,
  type MfaEnrollConfirmResult,
  type MfaEnrollRequest,
  type MfaEnrollResult,
  type MfaTenantUser,
  type MfaTotpProvider,
} from "./mfaEnrollment.js";
export { createMfaEnrollmentRepository } from "./mfaEnrollmentRepository.js";

export {
  isLegalTaxPlanCycleStageTransition,
  taxPlanCycleCreateSchema,
  taxPlanCyclePrioritySchema,
  taxPlanCycleReadParamsSchema,
  taxPlanCycleSchema,
  taxPlanCycleStageSchema,
  taxPlanCycleStages,
  type TaxPlanCycle,
  type TaxPlanCycleCreateInput,
  type TaxPlanCyclePriority,
  type TaxPlanCycleReadParams,
  type TaxPlanCycleStage,
} from "./taxPlanCycle.js";
export {
  createTaxPlanCycleRepository,
  createTaxPlanCycleReadHelper,
  type TaxPlanCycleInsertInput,
  type TaxPlanCycleQueueInput,
  type TaxPlanCycleQueueItem,
  type TaxPlanCycleReadHelper,
  type TaxPlanCycleReadInput,
  type TaxPlanCycleRepository,
  type TaxPlanCycleRepositoryCreateInput,
} from "./taxPlanCycleRepository.js";

import { config as loadEnv } from "dotenv";
import pg from "pg";

import { createApp } from "./app.js";
import { createCoreCaseOpenApiRouter } from "./coreCaseOpenApiRoutes.js";
import { createLogger } from "./logger.js";
import { createJwtAuthenticationMiddleware } from "./jwtAuthentication.js";
import { createCostAccountingMiddleware } from "./costAccounting.js";
import { createTenantRateLimitMiddleware } from "./tenantRateLimiting.js";
import { createMfaEnrollmentRouter } from "./mfaEnrollmentRoutes.js";
import { createTaxPlanCycleRouter } from "./taxPlanCycleRoutes.js";
import { createTaxPlanCycleCreateController } from "./taxPlanCycleCreateController.js";
import { createTaxPlanCycleRepository } from "./taxPlanCycleRepository.js";
import { getJwtConfigFromEnv } from "./authConfig.js";
import { createAuthRouter } from "./authRoutes.js";
import { createAuthMfaLoginRouter } from "./authMfaLoginRoutes.js";
import { createPasswordCredentialStore } from "./authCredentials.js";
import {
  createAuthMfaLoginController,
} from "./authMfaLogin.js";
import { authenticatePasswordForMfaChallenge } from "./authService.js";
import { createMfaEnrollmentController } from "./mfaEnrollment.js";
import { createMfaEnrollmentRepository } from "./mfaEnrollmentRepository.js";
import { createRefreshTokenRepository } from "./refreshTokenRepository.js";
import { createTokenService } from "./tokenService.js";

loadEnv();
const { Client } = pg;

export {
  createTaxPlanCycleCreateController,
  taxPlanCycleCreateController,
  taxPlanCycleCreateResultSchema,
  type TaxPlanCycleCreateControllerInput,
  type TaxPlanCycleCreateController,
  type TaxPlanCycleCreateResult,
} from "./taxPlanCycleCreateController.js";
export {
  createMfaEnrollmentRouter,
  type CreateMfaEnrollmentRouterOptions,
  type MfaValidationErrorIssue,
  type MfaValidationErrorResponse,
} from "./mfaEnrollmentRoutes.js";
export {
  createTaxPlanCycleRouter,
  type CreateTaxPlanCycleRouterOptions,
  type ValidationErrorIssue,
  type ValidationErrorResponse,
} from "./taxPlanCycleRoutes.js";

export function createGreeting(runtime: string = "TypeScript"): string {
  return `hello from ${runtime}`;
}

export function getPortFromEnv(env: NodeJS.ProcessEnv = process.env): number {
  const rawPort = env.PORT?.trim();

  if (!rawPort) {
    return 3000;
  }

  const port = Number(rawPort);

  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error("PORT must be an integer between 0 and 65535.");
  }

  return port;
}

export async function main(): Promise<Server> {
  const jwtConfig = getJwtConfigFromEnv();
  const logger = createLogger();

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to register authentication routes.");
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  const credentialReader = createPasswordCredentialStore(client);
  const mfaEnrollmentRepository = createMfaEnrollmentRepository(client);
  const refreshTokenRepository = createRefreshTokenRepository(client);
  const taxPlanCycleRepository = createTaxPlanCycleRepository(client);
  const taxPlanCycleController = createTaxPlanCycleCreateController(
    taxPlanCycleRepository,
  );
  const authenticatePassword = (input: Parameters<typeof authenticatePasswordForMfaChallenge>[0]) =>
    authenticatePasswordForMfaChallenge(input, credentialReader);
  const tokenService = createTokenService({
    config: jwtConfig,
    refreshTokenRepository,
  });

  logger.info("Connected to database for authentication routes");

  const mfaEnrollmentController = createMfaEnrollmentController({
    repository: mfaEnrollmentRepository,
  });
  const authMfaLoginController = createAuthMfaLoginController({
    tokenService,
    repository: mfaEnrollmentRepository,
  });

  const app = createApp({
    logger,
    registerRoutes: (app) => {
      app.use(createCoreCaseOpenApiRouter());
      app.use(createMfaEnrollmentRouter({
        controller: mfaEnrollmentController,
      }));
      app.use(
        "/tax-plan-cycles",
        createJwtAuthenticationMiddleware({ config: jwtConfig }),
        createCostAccountingMiddleware(),
        createTenantRateLimitMiddleware(),
      );
      app.use(createTaxPlanCycleRouter({ controller: taxPlanCycleController }));
      app.use(createAuthRouter({ authenticatePassword }));
      app.use(createAuthMfaLoginRouter({
        controller: authMfaLoginController,
      }));
    },
  });
  const port = getPortFromEnv();

  return await new Promise<Server>((resolve, reject) => {
    const server = app.listen(port, () => {
      logger.info({ port }, "Core Case Service listening");
      resolve(server);
    });

    server.on("error", reject);
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error: unknown) => {
    const logger = createLogger();

    logger.fatal(
      { err: error },
      "Core Case Service failed to start",
    );
    process.exitCode = 1;
  });
}
