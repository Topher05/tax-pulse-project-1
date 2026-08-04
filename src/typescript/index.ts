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
  createTenantLoginResolver,
  type TenantLoginResolution,
  type TenantLoginResolver,
} from "./tenantLoginResolver.js";
export {
  auditEntryOutputSchema,
  redactAuditText,
  redactedAuditAmount,
  serializeAuditEntryForOutput,
  type AuditEntryOutput,
  type StoredAuditEntry,
} from "./auditEntryOutput.js";
export {
  createAuditEntryRepository,
  type AuditEntryListInput,
  type AuditEntryReader,
} from "./auditEntryRepository.js";
export {
  createAuditEntryWriter,
  type AuditEntryWriteInput,
  type AuditEntryWriter,
} from "./auditEntryRepository.js";
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
  authSessionTokenResponseSchema,
  createAuthSessionRouter,
  type CreateAuthSessionRouterOptions,
} from "./authSessionRoutes.js";
export {
  clearRefreshTokenCookie,
  getRefreshTokenFromCookie,
  refreshTokenCookieName,
  setRefreshTokenCookie,
} from "./authSessionCookies.js";
export {
  createAuthRouter,
  mfaChallengeResponseSchema,
  passwordLoginRequestSchema,
  type AuthValidationErrorIssue,
  type AuthValidationErrorResponse,
  type CreateAuthRouterOptions,
  type MfaChallengeResponse,
  type PasswordAuthenticator,
  type PasswordLoginRequest,
} from "./authRoutes.js";
export {
  RegistrationEmailConflictError,
  registrationAccountResponseSchema,
  registrationInitialAccountValues,
  registrationRequestSchema,
  type RegistrationAccountInsert,
  type RegistrationAccountResponse,
  type RegistrationAccountStore,
  type RegistrationRequest,
} from "./authRegistration.js";
export {
  createRegistrationService,
  type CreateRegistrationServiceOptions,
  type RegistrationService,
} from "./authRegistrationService.js";
export { createRegistrationAccountRepository } from "./authRegistrationRepository.js";
export {
  coreCaseOpenApiSchemaRegistrations,
  createCoreCaseOpenApiDocument,
  type CoreCaseOpenApiSchemaRegistration,
} from "./coreCaseOpenApi.js";
export { createCoreCaseOpenApiRouter } from "./coreCaseOpenApiRoutes.js";
export {
  clientRoster,
  auditEntry,
  credential,
  federalTaxBracket,
  mfaEnrollment,
  refreshToken,
  roles,
  stageTransition,
  stateTaxBracket,
  taxPlanCycle,
  tenants,
  users,
  userStatus,
} from "./shared/database/schema.js";
export {
  clientRosterListResponseSchema,
  clientRosterRowSchema,
  createClientRosterRepository,
  createClientRosterRouter,
  type ClientRosterListInput,
  type ClientRosterListResponse,
  type ClientRosterRepository,
  type ClientRosterRow,
  type CreateClientRosterRouterOptions,
} from "./features/clientRoster/index.js";
export {
  createBracketReferenceRepository,
  type BracketReferenceLookupInput,
  type BracketReferenceLookupResult,
  type BracketReferenceRepository,
  type TaxBracketReference,
} from "./bracketReferenceRepository.js";
export {
  createScenarioRepository,
  maximumScenariosPerCase,
  ScenarioCaseNotFoundError,
  ScenarioLimitExceededError,
  type Scenario,
  type ScenarioCreateInput,
  type ScenarioCreateManyInput,
  type ScenarioRepository,
} from "./features/taxPlanCycle/index.js";
export {
  scenarioComparisonEngineInputSchema,
  scenarioComparisonEngineInputScenarioSchema,
  scenarioComparisonEngineOutputSchema,
  scenarioComparisonEngineOutputScenarioSchema,
  scenarioComparisonResponseSchema,
  scenarioComparisonResultSchema,
  scenarioModelingEngineResponseSchema,
  scenarioModelingEngineScenarioSchema,
  scenarioModelingRequestSchema,
  scenarioModelingResponseSchema,
  scenarioModelingScenarioInputSchema,
  type ScenarioModelingEngineResponse,
  type ScenarioModelingEngineScenario,
  type ScenarioModelingRequest,
  type ScenarioModelingResponse,
  type ScenarioModelingScenarioInput,
  type ScenarioComparisonEngineInput,
  type ScenarioComparisonEngineInputScenario,
  type ScenarioComparisonEngineOutput,
  type ScenarioComparisonEngineOutputScenario,
  type ScenarioComparisonResponse,
  type ScenarioComparisonResult,
} from "./features/taxPlanCycle/index.js";
export {
  scenarioComputedResultSchema,
  scenarioSchema,
  scenarioComparisonSummarySchema,
  scenarioTypedFiguresSchema,
  type ScenarioComputedResult,
  type ScenarioTypedFigures,
  type ScenarioComparisonSummary,
} from "./scenario.js";
export {
  createTaxEngineClient,
  TaxEngineHttpError,
  TaxEngineTimeoutError,
  type TaxEngineClient,
  type TaxEngineClientOptions,
  type TaxCalculationEngineFilingStatus,
  type TaxCalculationEngineInput,
  type TaxCalculationEngineRequest,
  type TaxCalculationEngineResult,
  type ScenarioComparisonEngineRequest,
  type TaxEngineComparisonRequest,
} from "./features/taxPlanCycle/index.js";
export {
  getJwtConfigFromEnv,
  getTenantLoginBaseDomainFromEnv,
  type JwtConfig,
} from "./authConfig.js";
export {
  createJwtAuthenticationMiddleware,
  hydrateUserClaims,
  type CreateJwtAuthenticationMiddlewareOptions,
  type CreateHydrateUserClaimsOptions,
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
  taxPlanCycleTransitionParamsSchema,
  taxPlanCycleTransitionSchema,
  taxPlanCycleSchema,
  taxPlanCycleStageSchema,
  taxPlanCycleStages,
  type TaxPlanCycle,
  type TaxPlanCycleCreateInput,
  type TaxPlanCyclePriority,
  type TaxPlanCycleReadParams,
  type TaxPlanCycleTransitionInput,
  type TaxPlanCycleTransitionParams,
  type TaxPlanCycleStage,
} from "./features/taxPlanCycle/index.js";
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
  type TaxPlanCycleTransitionInput as TaxPlanCycleRepositoryTransitionInput,
  TAXPULSE_PLAN_CYCLE_QUEUE_PROJECTION_CASE_KEY,
  TAXPULSE_PLAN_CYCLE_QUEUE_PROJECTION_TABLE_NAME,
  TAXPULSE_PLAN_CYCLE_QUEUE_PROJECTION_TENANT_KEY,
  buildTaxPlanCycleCreateIdempotencyKey,
  buildTaxPlanCycleQueueReadCacheKey,
  buildTaxPlanCycleQueueTenantVersionKey,
  createNoopTaxPlanCycleQueueCacheInvalidator,
  createUnavailableTaxPlanCycleCreateIdempotencyStore,
  createTaxPlanCycleQueueCache,
  createTaxPlanCycleQueueCacheInvalidator,
  createRedisTaxPlanCycleCreateIdempotencyStore,
  TaxPlanCycleCreateIdempotencyInProgressError,
  TaxPlanCycleCreateIdempotencyUnavailableError,
  createTaxPlanCycleQueueDynamoDocumentClient,
  createTaxPlanCycleQueueProjectionStore,
  createTaxPlanCycleQueueReadService,
  createTaxPlanCycleCreateController,
  taxPlanCycleCreateController,
  taxPlanCycleCreateResultSchema,
  createTaxPlanCycleTransitionController,
  taxPlanCycleTransitionController,
  createTaxPlanCycleRouter,
  taxPlanCycleQueueProjectionItemSchema,
  taxPlanCycleQueueProjectionItemsSchema,
  type CreateTaxPlanCycleCreateControllerOptions,
  type CreateTaxPlanCycleRouterOptions,
  type TaxPlanCycleCreateControllerInput,
  type TaxPlanCycleCreateController,
  type TaxPlanCycleCreateResult,
  type TaxPlanCycleQueueCache,
  type TaxPlanCycleQueueCacheClient,
  type TaxPlanCycleQueueCacheInvalidator,
  type TaxPlanCycleQueueCacheReadInput,
  type TaxPlanCycleCreateIdempotencyClient,
  type TaxPlanCycleCreateIdempotencyInput,
  type TaxPlanCycleCreateIdempotencyStore,
  type TaxPlanCycleQueueProjectionDynamoClient,
  type TaxPlanCycleQueueProjectionItem,
  type TaxPlanCycleQueueProjectionReader,
  type TaxPlanCycleQueueReadService,
  type TaxPlanCycleQueueReadServiceOptions,
  type TaxPlanCycleTransitionControllerOptions,
  type TaxPlanCycleTransitionController,
  type ValidationErrorIssue,
  type ValidationErrorResponse,
} from "./features/taxPlanCycle/index.js";

// Feature export block separation for runtime startup safety
import { config as loadEnv } from "dotenv";
import pg from "pg";
import { createClient } from "redis";

import { createApp } from "./app.js";
import { createCoreCaseOpenApiRouter } from "./coreCaseOpenApiRoutes.js";
import { createLogger } from "./logger.js";
import { createJwtAuthenticationMiddleware, hydrateUserClaims } from "./jwtAuthentication.js";
import { createCostAccountingMiddleware } from "./costAccounting.js";
import { createTenantRateLimitMiddleware } from "./tenantRateLimiting.js";
import { createMfaEnrollmentRouter } from "./mfaEnrollmentRoutes.js";
import {
  createNoopTaxPlanCycleQueueCacheInvalidator,
  createRedisTaxPlanCycleCreateIdempotencyStore,
  createTaxPlanCycleCreateController,
  createTaxPlanCycleQueueCache,
  createTaxPlanCycleQueueCacheInvalidator,
  createTaxPlanCycleRepository,
  createTaxPlanCycleRouter,
  createTaxPlanCycleTransitionController,
  createScenarioModelingController,
  createScenarioRepository,
  createTaxEngineClient,
} from "./features/taxPlanCycle/index.js";
import {
  getJwtConfigFromEnv,
  getTenantLoginBaseDomainFromEnv,
} from "./authConfig.js";
import { createAuthRouter } from "./authRoutes.js";
import { createAuthMfaLoginRouter } from "./authMfaLoginRoutes.js";
import { createAuthSessionRouter } from "./authSessionRoutes.js";
import { createPasswordCredentialStore } from "./authCredentials.js";
import { createTenantLoginResolver } from "./tenantLoginResolver.js";
import { createRegistrationAccountRepository } from "./authRegistrationRepository.js";
import { createRegistrationService } from "./authRegistrationService.js";
import {
  createAuditEntryRepository,
  createAuditEntryWriter,
} from "./auditEntryRepository.js";
import {
  createAuthMfaLoginController,
} from "./authMfaLogin.js";
import { authenticatePasswordForMfaChallenge } from "./authService.js";
import { createMfaEnrollmentController } from "./mfaEnrollment.js";
import { createMfaEnrollmentRepository } from "./mfaEnrollmentRepository.js";
import { createRefreshTokenRepository } from "./refreshTokenRepository.js";
import { createTokenService } from "./tokenService.js";
import {
  createClientRosterRepository,
  createClientRosterRouter,
} from "./features/clientRoster/index.js";

loadEnv();
const { Client } = pg;
const taxPlanCycleApiPrefix = "/v1";
const taxPlanCycleApiBasePath = `${taxPlanCycleApiPrefix}/tax-plan-cycles`;
const clientRosterApiBasePath = `${taxPlanCycleApiPrefix}/clients`;

export {
  createMfaEnrollmentRouter,
  type CreateMfaEnrollmentRouterOptions,
  type MfaValidationErrorIssue,
  type MfaValidationErrorResponse,
} from "./mfaEnrollmentRoutes.js";

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
  const tenantLoginBaseDomain = getTenantLoginBaseDomainFromEnv();
  const logger = createLogger();

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to register authentication routes.");
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  const credentialReader = createPasswordCredentialStore(client);
  const tenantLoginResolver = createTenantLoginResolver(client);
  const registrationService = createRegistrationService({
    store: createRegistrationAccountRepository(client),
  });
  const mfaEnrollmentRepository = createMfaEnrollmentRepository(client);
  const refreshTokenRepository = createRefreshTokenRepository(client);
  const taxPlanCycleRepository = createTaxPlanCycleRepository(client);
  const clientRosterRepository = createClientRosterRepository(client);
  const scenarioRepository = createScenarioRepository(client);
  const queueRedisUrl = process.env.TAXPULSE_REDIS_URL?.trim();
  const liabilityEngineBase = process.env.LIABILITY_ENGINE_BASE?.trim();
  let queueCacheRedisClient: ReturnType<typeof createClient> | undefined;
  let queueCacheInvalidator = createNoopTaxPlanCycleQueueCacheInvalidator();
  let createIdempotencyStore: ReturnType<
    typeof createRedisTaxPlanCycleCreateIdempotencyStore
  > | undefined;
  let scenarioModelingController:
    | ReturnType<typeof createScenarioModelingController>
    | undefined;

  if (queueRedisUrl) {
    queueCacheRedisClient = createClient({ url: queueRedisUrl });
    await queueCacheRedisClient.connect();
    const queueCache = createTaxPlanCycleQueueCache(queueCacheRedisClient);
    createIdempotencyStore = createRedisTaxPlanCycleCreateIdempotencyStore(
      queueCacheRedisClient,
    );
    queueCacheInvalidator = createTaxPlanCycleQueueCacheInvalidator(
      queueCache,
    );
    logger.info("Connected to Redis for queue cache invalidation and create idempotency");
  }

  if (liabilityEngineBase) {
    const taxEngineClient = createTaxEngineClient({
      baseUrl: liabilityEngineBase,
    });
    scenarioModelingController = createScenarioModelingController({
      taxPlanCycleRepository,
      scenarioRepository,
      taxEngineClient,
    });
    logger.info("Connected to the liability engine for scenario modeling");
  }

  const auditEntryRepository = createAuditEntryRepository(client);
  const auditEntryWriter = createAuditEntryWriter(client);
  const taxPlanCycleController = createTaxPlanCycleCreateController(
    taxPlanCycleRepository,
    {
      idempotencyStore: createIdempotencyStore,
    },
  );
  const taxPlanCycleTransitionController = createTaxPlanCycleTransitionController(
    taxPlanCycleRepository,
    {
      queueCacheInvalidator,
    },
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
      // CL Version-scoped auth middleware for Tax Plan Cycle routes; review before removing or widening this guard.
      app.use(
        taxPlanCycleApiBasePath,
        createJwtAuthenticationMiddleware({ config: jwtConfig }),
        hydrateUserClaims(),
        createCostAccountingMiddleware(),
        createTenantRateLimitMiddleware(),
      );
      app.use(
        clientRosterApiBasePath,
        createJwtAuthenticationMiddleware({ config: jwtConfig }),
        hydrateUserClaims(),
        createCostAccountingMiddleware(),
        createTenantRateLimitMiddleware(),
      );
      app.use(
        taxPlanCycleApiPrefix,
        createTaxPlanCycleRouter({
          auditEntryReader: auditEntryRepository,
          auditEntryWriter,
          controller: taxPlanCycleController,
          taxPlanCycleRepository,
          scenarioRepository,
          scenarioModelingController,
          transitionController: taxPlanCycleTransitionController,
        }),
      );
      app.use(
        taxPlanCycleApiPrefix,
        createClientRosterRouter({
          repository: clientRosterRepository,
        }),
      );
      app.use(
        createAuthRouter({
          authenticatePassword,
          registrationService,
          tenantLoginResolver,
          tenantLoginBaseDomain,
        }),
      );
      app.use(createAuthMfaLoginRouter({
        controller: authMfaLoginController,
      }));
      app.use(createAuthSessionRouter({ tokenService }));
    },
  });
  const port = getPortFromEnv();

  return await new Promise<Server>((resolve, reject) => {
    const server = app.listen(port, () => {
      logger.info("Core Case Service listening");
      resolve(server);
    });

    server.on("close", () => {
      if (queueCacheRedisClient) {
        void queueCacheRedisClient.quit().catch(() => undefined);
      }
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
