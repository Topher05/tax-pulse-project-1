import { fileURLToPath } from "node:url";
import type { Server } from "node:http";

export {
  clientDeductionAggregationPayloadSchema,
  deductionCreateSchema,
  deductionReadParamsSchema,
  deductionCategorySchema,
  deductionCategoryValues,
  deductionSchema,
  deductionTableRowSchema,
  deductionTableRowsSchema,
  incomeEventSchema,
  type DeductionCategory,
  type DeductionCreate,
  type ClientDeductionAggregationPayload,
  type Deduction,
  type DeductionTableRow,
  type DeductionTableRows,
  type IncomeEvent,
} from "./features/deductions/repositories/deduction.js";
export {
  AggregationTimeoutError,
  TaxPulseAggregationClient,
  type AggregationDataSource,
  type TaxPulseAggregationClientOptions,
} from "./features/deductions/infrastructure/aggregationClient.js";
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
} from "./shared/cloud-logger/logger.js";
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
  createDeductionRepository,
  createDeductionsRouter,
  type CreateDeductionsRouterOptions,
  type DeductionListInput,
  type DeductionRepository,
} from "./features/deductions/index.js";
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
  createJwksRouter,
  type CreateJwksRouterOptions,
} from "./jwksRoutes.js";
export {
  getJwtJwksVerifierConfigFromEnv,
  getJwtRs256IssuerConfigFromEnv,
  type JwtJwksVerifierConfig,
  type JwtRs256IssuerConfig,
} from "./jwtRs256Config.js";
export {
  clientRoster,
  auditEntry,
  actionItem,
  deduction,
  credential,
  federalTaxBracket,
  mfaEnrollment,
  outboxEvent,
  refreshToken,
  roles,
  stageTransition,
  stateTaxBracket,
  taxpayerIdentifierValidation,
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
  createFirmUsersRepository,
  createFirmUsersRouter,
  firmUserAssignableRoleSchema,
  firmUserRoleSchema,
  firmUserRoleUpdateParamsSchema,
  firmUserRoleUpdateRequestSchema,
  firmUsersListResponseSchema,
  firmUserRowSchema,
  firmUserStatusSchema,
  type CreateFirmUsersRouterOptions,
  type FirmUserAssignableRole,
  type FirmUserRole,
  type FirmUserRoleUpdateInput,
  type FirmUserRoleUpdateParams,
  type FirmUserRoleUpdateRequest,
  type FirmUsersListInput,
  type FirmUsersListResponse,
  type FirmUserRow,
  type FirmUsersRepository,
  type FirmUserStatus,
} from "./features/firmUsers/index.js";
export {
  createPlatformAdministrationRepository,
  createPlatformAdministrationRouter,
  platformTenantUserCreateParamsSchema,
  platformTenantUserCreateRequestSchema,
  platformTenantUserRowSchema,
  platformTenantUsersListResponseSchema,
  platformTenantUsersTenantSchema,
  PlatformTenantUserEmailConflictError,
  type CreatePlatformAdministrationRouterOptions,
  type PlatformAdministrationRepository,
  type PlatformTenantUserCreateInput,
  type PlatformTenantUserCreateParams,
  type PlatformTenantUserCreateRequest,
  type PlatformTenantUserRow,
  type PlatformTenantUsersListResponse,
  type PlatformTenantUsersTenant,
} from "./features/platformAdministration/index.js";
export {
  buildIncomeEventMockRows,
  createIncomeEventsRouter,
  incomeEventReadParamsSchema,
  incomeEventRowsSchema,
  incomeEventRowSchema,
  incomeEventTypeSchema,
  type CreateIncomeEventsRouterOptions,
  type IncomeEventsMockCase,
  type IncomeEventRow,
  type IncomeEventRows,
  type IncomeEventType,
} from "./features/incomeEvents/index.js";
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
  actionItemSchema,
  type ActionItem,
  actionItemCreatedCloudEventSchemaV1,
  actionItemCreatedEventDataSchema,
  actionItemCreatedEventDataSchemaV1,
  actionItemCreatedEventSchemaVersion,
  actionItemCreatedEventSource,
  actionItemCreatedEventType,
  actionItemCreatedEventInputSchema,
  createActionItemCreatedCloudEvent,
  type ActionItemCreatedCloudEventV1,
  type ActionItemCreatedEventDataV1,
  type ActionItemCreatedEventInput,
  type ActionItemCreatedEventPublishInput,
  type CreateActionItemCreatedCloudEventOptions,
  createActionItemCreatedSnsClient,
  createSnsActionItemCreatedEventPublisher,
  getActionItemCreatedTopicArnFromEnv,
  type ActionItemCreatedSnsClient,
  actionItemCompletedCloudEventSchemaV1,
  actionItemCompletedEventDataSchema,
  actionItemCompletedEventDataSchemaV1,
  actionItemCompletedEventSchemaVersion,
  actionItemCompletedEventSource,
  actionItemCompletedEventType,
  createActionItemCompletedCloudEvent,
  createActionItemCompletedSqsConsumer,
  getActionItemCompletedQueueUrlFromEnv,
  parseActionItemCompletedSqsMessage,
  type ActionItemCompletedCloudEventV1,
  type ActionItemCompletedEventPublishInput,
  createActionItemRepository,
  type ActionItemCreateInput,
  type ActionItemRepository,
  type ActionItemCreatedEventPublisher,
  ACTION_ITEM_CREATED_CONSUMER_NAME,
  ACTION_ITEM_CREATED_IDEMPOTENCY_NAMESPACE,
  createActionItemConsumer,
  createRedisActionItemConsumer,
  createPresentToClientSaga,
  createJwtLambdaAuthenticator,
  createPresentToClientLambdaHandler,
  createExecuteLambdaHandler,
  serializeLambdaJsonResponse,
  serializeLambdaProblemResponse,
  presentToClientHandler,
  executeHandler,
  resetTaxPlanCycleLambdaRuntimeForTests,
  type CreateExecuteLambdaHandlerOptions,
  type CreateJwtLambdaAuthenticatorOptions,
  type CreatePresentToClientLambdaHandlerOptions,
  type LambdaAuthenticator,
  type LambdaHttpRequest,
  type LambdaHttpResponse,
  type LambdaRequestContext,
  type TaxPlanCycleLambdaRuntime,
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
  createTinEinValidationSoapClient,
  getTinEinValidationSoapConfigFromEnv,
  type TinEinValidationSoapClient,
  type TinEinValidationSoapClientOptions,
  type TivsGetTaxpayerStatusRawResponse,
  type TivsGetTaxpayerStatusRequest,
  type TivsMatchCode,
  type TivsStandingCode,
  type TivsTinType,
  type TivsVerifyTaxpayerRawResponse,
  type TivsVerifyTaxpayerRequest,
} from "./features/taxPlanCycle/index.js";
export {
  createTinEinValidationAcl,
  createTaxpayerIdentifierValidationRepository,
  isTaxpayerIdentifierSoapFaultError,
  taxpayerIdentifierInputSchema,
  taxpayerIdentifierTypeSchema,
  taxpayerIdentifierTypeValues,
  taxpayerIdentifierValidationResultSchema,
  taxpayerIdentifierValidationResultValues,
  taxpayerIdentifierValidationSchema,
  translateSoapFault,
  TaxpayerIdentifierSoapFaultError,
  type TaxpayerIdentifierInput,
  type TaxpayerIdentifierSoapFaultOptions,
  type TaxpayerIdentifierType,
  type TaxpayerIdentifierValidation,
  type TaxpayerIdentifierValidationOutcome,
  type TaxpayerIdentifierValidationReadInput,
  type TaxpayerIdentifierValidationRecordInput,
  type TaxpayerIdentifierValidationRepository,
  type TaxpayerIdentifierValidationResult,
  type TaxpayerIdentifierValidator,
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
  stageChangedCloudEventSchemaV1,
  stageChangedEventDataSchema,
  stageChangedEventDataSchemaV1,
  stageChangedEventSchemaVersion,
  stageChangedEventSource,
  stageChangedEventType,
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
  type StageChangedCloudEventV1,
  type StageChangedEventDataV1,
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
  createOutboxRelay,
  createPostgresOutboxRelayStore,
  createSnsOutboxEventPublisher,
  createRedisTaxPlanCycleCreateIdempotencyStore,
  createRedisIdempotencyStore,
  createConsumer,
  createRedisConsumer,
  createStageChangedProjectionUpdater,
  createStageChangedLambdaHandler,
  createStageChangedLambdaRuntimeHandler,
  TaxPlanCycleCreateIdempotencyInProgressError,
  TaxPlanCycleCreateIdempotencyUnavailableError,
  createTaxPlanCycleQueueDynamoDocumentClient,
  createTaxPlanCycleQueueProjectionStore,
  createWriter,
  createTaxPlanCycleQueueReadService,
  createSnsStageChangedEventPublisher,
  createStageChangedCloudEventV1,
  PublishCommand,
  createStageChangedSnsClient,
  getStageChangedTopicArnFromEnv,
  createSqsStageChangedEventConsumer,
  createStageChangedSqsClient,
  getStageChangedQueueUrlFromEnv,
  parseStageChangedSqsMessage,
  createTaxPlanCycleCreateController,
  taxPlanCycleCreateController,
  taxPlanCycleCreateResultSchema,
  createTaxPlanCycleTransitionController,
  taxPlanCycleTransitionController,
  createTaxPlanCycleRouter,
  STAGE_CHANGED_CONSUMER_NAME,
  buildIdempotencyKey,
  taxPlanCycleQueueProjectionItemSchema,
  taxPlanCycleQueueProjectionItemsSchema,
  createStageChangedCloudEvent,
  type CreateTaxPlanCycleCreateControllerOptions,
  type CreateTaxPlanCycleRouterOptions,
  type TaxPlanCycleCreateControllerInput,
  type TaxPlanCycleCreateController,
  type TaxPlanCycleCreateResult,
  type TaxPlanCycleQueueCache,
  type TaxPlanCycleQueueCacheClient,
  type TaxPlanCycleQueueCacheInvalidator,
  type TaxPlanCycleQueueCacheReadInput,
  type DeadLetterOutboxEvent,
  type OutboxEventPublisher,
  type OutboxRelay,
  type OutboxRelayOptions,
  type OutboxRelayStore,
  type UnsentOutboxEvent,
  type TaxPlanCycleCreateIdempotencyClient,
  type TaxPlanCycleCreateIdempotencyInput,
  type TaxPlanCycleCreateIdempotencyStore,
  type ConsumerHandleResult,
  type ConsumerOptions,
  type TaxPlanCycleQueueProjectionDynamoClient,
  type TaxPlanCycleQueueProjectionItem,
  type TaxPlanCycleQueueProjectionReader,
  type IdempotencyGuard,
  type IdempotencyInput,
  type IdempotencyStore,
  type StageChangedLambdaBatchItemFailure,
  type StageChangedLambdaBatchResponse,
  type StageChangedLambdaHandlerDependencies,
  type StageChangedLambdaRuntimeDependencies,
  type StageChangedLambdaSqsEvent,
  type StageChangedLambdaSqsRecord,
  type StageChangedProjectionDynamoClient,
  type StageChangedProjectionUpdater,
  type Writer,
  type WriterClient,
  type TaxPlanCycleQueueReadService,
  type TaxPlanCycleQueueReadServiceOptions,
  type StageChangedEventPublisher,
  type PresentToClientActionItemCreatedEventPublisher,
  type PresentToClientSaga,
  type PresentToClientSagaInput,
  type PresentToClientSagaOptions,
  type PresentToClientStageChangedEventPublisher,
  type TaxPlanCycleTransitionControllerInput,
  type CreateStageChangedCloudEventOptions,
  type ConsumeStageChangedEventsResult,
  type StageChangedEventConsumerLogger,
  type StageChangedEventPublishInput,
  type StageChangedSnsClient,
  type StageChangedSqsClient,
  type StageChangedSqsConsumerOptions,
  type TaxPlanCycleTransitionControllerOptions,
  type TaxPlanCycleTransitionEventLogger,
  type TaxPlanCycleTransitionController,
  type ValidationErrorIssue,
  type ValidationErrorResponse,
} from "./features/taxPlanCycle/index.js";

// Feature export block separation for runtime startup safety
import { config as loadEnv } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { createClient } from "redis";

import { createApp } from "./app.js";
import { createCoreCaseOpenApiRouter } from "./coreCaseOpenApiRoutes.js";
import { createLogger } from "./shared/cloud-logger/logger.js";
import { createJwksRouter } from "./jwksRoutes.js";
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
  createActionItemRepository,
  createActionItemCompletedSnsPublisher,
  createSnsStageChangedEventPublisher,
  createStageChangedSnsClient,
  createQuarterlyPaymentsRouter,
  createTaxPlanCycleRouter,
  createTaxPlanCycleTransitionController,
  createScenarioModelingController,
  createScenarioRepository,
  createTaxEngineClient,
  createTinEinValidationAcl,
  createTinEinValidationSoapClient,
  createTaxpayerIdentifierValidationRepository,
  getTinEinValidationSoapConfigFromEnv,
  type TaxpayerIdentifierValidator,
} from "./features/taxPlanCycle/index.js";
import {
  getJwtConfigFromEnv,
  getTenantLoginBaseDomainFromEnv,
} from "./authConfig.js";
import { getJwtRs256IssuerConfigFromEnv } from "./jwtRs256Config.js";
import { createAuthRouter } from "./authRoutes.js";
import { createAuthMfaLoginRouter } from "./authMfaLoginRoutes.js";
import { createAuthSessionRouter } from "./authSessionRoutes.js";
import { createPasswordCredentialStore } from "./authCredentials.js";
import { createTenantLoginResolver } from "./tenantLoginResolver.js";
import {
  createDeductionRepository,
  createDeductionsRouter,
} from "./features/deductions/index.js";
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
import {
  createFirmUsersRepository,
  createFirmUsersRouter,
} from "./features/firmUsers/index.js";
import {
  createPlatformAdministrationRepository,
  createPlatformAdministrationRouter,
} from "./features/platformAdministration/index.js";
import { createIncomeEventsRouter } from "./features/incomeEvents/index.js";
import { createOpenAIEmbeddingProvider } from "./assist/embeddings.js";
import { createOpenAIAssistExplanationProvider } from "./assist/explanation.js";
import { retrieveHybridCorpusChunks } from "./assist/retrieval.js";
import { parseAssistTenantCorpusScopeMap } from "./assist/tenantScopes.js";
import { createTaxPlanDetailsAssistantController } from "./features/taxPlanCycle/controllers/assistantController.js";

loadEnv();
const { Client } = pg;
const taxPlanCycleApiPrefix = "/v1";

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
  const jwtRs256IssuerConfig = process.env.JWT_SIGNING_PRIVATE_KEY?.trim()
    ? getJwtRs256IssuerConfigFromEnv()
    : undefined;
  if (!jwtRs256IssuerConfig && !jwtConfig.signingSecret) {
    throw new Error("RS256 issuer configuration is required.");
  }
  const tenantLoginBaseDomain = getTenantLoginBaseDomainFromEnv();
  const logger = createLogger();

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to register authentication routes.");
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  const db = drizzle(client);

  const credentialReader = createPasswordCredentialStore(client);
  const tenantLoginResolver = createTenantLoginResolver(client);
  const registrationService = createRegistrationService({
    store: createRegistrationAccountRepository(client),
  });
  const mfaEnrollmentRepository = createMfaEnrollmentRepository(client);
  const refreshTokenRepository = createRefreshTokenRepository(client);
  const taxPlanCycleRepository = createTaxPlanCycleRepository(client);
  const actionItemRepository = createActionItemRepository(client);
  const clientRosterRepository = createClientRosterRepository(client);
  const firmUsersRepository = createFirmUsersRepository(client);
  const platformAdministrationRepository = createPlatformAdministrationRepository(client);
  const scenarioRepository = createScenarioRepository(client);
  const deductionRepository = createDeductionRepository(client);
  const assistTenantScopeMap = parseAssistTenantCorpusScopeMap();
  const assistEmbeddingProvider = createOpenAIEmbeddingProvider();
  const assistExplanationProvider = createOpenAIAssistExplanationProvider();
  const taxpayerIdentifierValidationRepository =
    createTaxpayerIdentifierValidationRepository(client);
  const queueRedisUrl = process.env.TAXPULSE_REDIS_URL?.trim();
  const liabilityEngineBase = process.env.LIABILITY_ENGINE_BASE?.trim();
  const stageChangedTopicArn = process.env.TAXPULSE_STAGE_CHANGED_TOPIC_ARN?.trim();
  const tivsConfigComplete = [
    process.env.TIVS_WSDL_URL,
    process.env.TIVS_ENDPOINT_URL,
    process.env.TIVS_USERNAME,
    process.env.TIVS_PASSWORD,
  ].every((value) => value?.trim());
  let queueCacheRedisClient: ReturnType<typeof createClient> | undefined;
  let queueCacheInvalidator = createNoopTaxPlanCycleQueueCacheInvalidator();
  let createIdempotencyStore: ReturnType<
    typeof createRedisTaxPlanCycleCreateIdempotencyStore
  > | undefined;
  let stageChangedEventPublisher:
    | ReturnType<typeof createSnsStageChangedEventPublisher>
    | undefined;
  let actionItemCompletedEventPublisher:
    | ReturnType<typeof createActionItemCompletedSnsPublisher>
    | undefined;
  let scenarioModelingController:
    | ReturnType<typeof createScenarioModelingController>
    | undefined;
  let taxpayerIdentifierValidator: TaxpayerIdentifierValidator | undefined;

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

  if (stageChangedTopicArn) {
    const stageChangedSnsClient = createStageChangedSnsClient(process.env);
    stageChangedEventPublisher = createSnsStageChangedEventPublisher(
      stageChangedSnsClient,
      stageChangedTopicArn,
    );
    actionItemCompletedEventPublisher = createActionItemCompletedSnsPublisher(
      stageChangedSnsClient,
      stageChangedTopicArn,
    );
    logger.info("Connected to SNS for tax plan cycle event publishing");
  }

  if (liabilityEngineBase) {
    const taxEngineClient = createTaxEngineClient({
      baseUrl: liabilityEngineBase,
      telemetryLogger: logger,
    });
    scenarioModelingController = createScenarioModelingController({
      taxPlanCycleRepository,
      scenarioRepository,
      taxEngineClient,
      telemetryLogger: logger,
    });
    logger.info("Connected to the liability engine for scenario modeling");
  }

  if (tivsConfigComplete) {
    const tivsSoapClient = await createTinEinValidationSoapClient(
      getTinEinValidationSoapConfigFromEnv(),
    );
    taxpayerIdentifierValidator = createTinEinValidationAcl(tivsSoapClient);
    logger.info("Connected to TIVS for Intake taxpayer identifier validation");
  }

  const auditEntryRepository = createAuditEntryRepository(client);
  const auditEntryWriter = createAuditEntryWriter(client);
  const taxPlanCycleController = createTaxPlanCycleCreateController(
    taxPlanCycleRepository,
    {
      idempotencyStore: createIdempotencyStore,
      taxpayerIdentifierValidator,
      taxpayerIdentifierValidationRepository,
    },
  );
  const taxPlanCycleTransitionController = createTaxPlanCycleTransitionController(
    taxPlanCycleRepository,
    {
      queueCacheInvalidator,
      stageChangedEventPublisher,
      telemetryLogger: logger,
    },
  );
  const authenticatePassword = (input: Parameters<typeof authenticatePasswordForMfaChallenge>[0]) =>
    authenticatePasswordForMfaChallenge(input, credentialReader);
  const assistantController = createTaxPlanDetailsAssistantController({
    taxPlanCycleRepository,
    tenantScopeMap: assistTenantScopeMap,
    retriever: {
      async retrieve(input) {
        return await retrieveHybridCorpusChunks(
          db as never,
          input.query,
          {
            limit: input.limit,
            tenantScopes: input.tenantScopes,
          },
          assistEmbeddingProvider,
        );
      },
    },
    explanationProvider: assistExplanationProvider,
  });
  const tokenService = createTokenService({
    config: jwtConfig,
    rs256IssuerConfig: jwtRs256IssuerConfig,
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
      if (jwtRs256IssuerConfig) {
        app.use(createJwksRouter({ issuerConfig: jwtRs256IssuerConfig }));
      }
      app.use(createCoreCaseOpenApiRouter());
      app.use(createMfaEnrollmentRouter({
        controller: mfaEnrollmentController,
      }));
      // CL Version-scoped auth middleware for v1 routes; review before removing or widening this guard.
      app.use(
        taxPlanCycleApiPrefix,
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
          assistantController,
          clientPortalReadRepository: taxPlanCycleRepository,
          actionItemRepository,
          actionItemCompletedEventPublisher,
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
        taxPlanCycleApiPrefix,
        createFirmUsersRouter({
          repository: firmUsersRepository,
        }),
      );
      app.use(
        taxPlanCycleApiPrefix,
        createPlatformAdministrationRouter({
          repository: platformAdministrationRepository,
        }),
      );
      app.use(
        taxPlanCycleApiPrefix,
        createDeductionsRouter({
          repository: deductionRepository,
        }),
      );
      app.use(
        taxPlanCycleApiPrefix,
        createIncomeEventsRouter({
          taxPlanCycleRepository,
        }),
      );
      app.use(
        taxPlanCycleApiPrefix,
        createQuarterlyPaymentsRouter({
          taxPlanCycleRepository,
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
        secureCookies: process.env.NODE_ENV === "production",
      }));
      app.use(createAuthSessionRouter({
        tokenService,
        secureCookies: process.env.NODE_ENV === "production",
      }));
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
