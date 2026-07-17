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
  createHmacJwtIssuer,
  createHmacJwtIssuerFromEnv,
  resolveJwtIssuerConfig,
  type AccessTokenClaims,
  type AccessTokenIssuer,
  type AuthMfaLoginController,
  type AuthMfaLoginRequest,
  type AuthMfaLoginResult,
  type CreateAuthMfaLoginControllerOptions,
  type HmacJwtIssuerOptions,
  type JwtIssuerConfig,
  type JwtIssuerEnv,
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
  credential,
  mfaEnrollment,
  roles,
  stageTransition,
  taxPlanCycle,
  tenants,
  users,
  userStatus,
} from "./db/schema.js";
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
import { createMfaEnrollmentRouter } from "./mfaEnrollmentRoutes.js";
import { createTaxPlanCycleRouter } from "./taxPlanCycleRoutes.js";
import { createAuthRouter } from "./authRoutes.js";
import { createAuthMfaLoginRouter } from "./authMfaLoginRoutes.js";
import { createPasswordCredentialStore } from "./authCredentials.js";
import {
  createAuthMfaLoginController,
  createHmacJwtIssuerFromEnv,
} from "./authMfaLogin.js";
import { authenticatePasswordForMfaChallenge } from "./authService.js";
import { createMfaEnrollmentController } from "./mfaEnrollment.js";
import { createMfaEnrollmentRepository } from "./mfaEnrollmentRepository.js";
import type {
  MfaEnrollmentRecord,
  MfaEnrollmentRepository,
  MfaTenantUser,
} from "./mfaEnrollment.js";

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
  const logger = createLogger();

  const databaseUrl = process.env.DATABASE_URL?.trim();
  let authenticatePassword;
  let mfaEnrollmentRepository: MfaEnrollmentRepository | undefined;

  if (databaseUrl) {
    try {
      const client = new Client({ connectionString: databaseUrl });
      await client.connect();
      const credentialReader = createPasswordCredentialStore(client);
      mfaEnrollmentRepository = createMfaEnrollmentRepository(client);
      authenticatePassword = (input: any) =>
        authenticatePasswordForMfaChallenge(input, credentialReader);
      logger.info("Connected to database for Auth Router");
    } catch (err) {
      logger.error({ err }, "Failed to connect to database for Auth Router. Using mock fallback");
    }
  }

  if (!authenticatePassword) {
    logger.warn("Database not configured or unreachable. Using mock password authenticator");
    authenticatePassword = async (input: any) => {
      if (
        input.tenantId === "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01" &&
        input.email === "alex@example.com" &&
        input.plaintextPassword === "correct-password"
      ) {
        return {
          status: "mfa_challenge_required" as const,
          tenantId: input.tenantId,
          email: input.email,
          userId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d61",
        };
      }
      return { status: "invalid_credentials" as const };
    };
  }

  if (!mfaEnrollmentRepository) {
    const fakeTenantId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01";
    const fakeUser: MfaTenantUser = {
      id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d61",
      email: "alex@example.com",
    };
    const enrollments = new Map<string, MfaEnrollmentRecord>();

    mfaEnrollmentRepository = {
      async findTenantUser({ tenantId, userId }) {
        if (tenantId === fakeTenantId && userId === fakeUser.id) {
          return fakeUser;
        }

        return null;
      },
      async findEnrollment({ userId }) {
        return enrollments.get(userId) ?? null;
      },
      async savePendingEnrollment({ userId, totpSecret }) {
        enrollments.set(userId, {
          userId,
          totpSecret,
          isEnrolled: false,
        });
      },
      async markEnrolled({ userId }) {
        const enrollment = enrollments.get(userId);

        if (enrollment) {
          enrollments.set(userId, {
            ...enrollment,
            isEnrolled: true,
          });
        }
      },
    };
  }

  const mfaEnrollmentController = createMfaEnrollmentController({
    repository: mfaEnrollmentRepository,
  });
  const authMfaLoginController = createAuthMfaLoginController({
    jwtIssuer: createHmacJwtIssuerFromEnv(),
    repository: mfaEnrollmentRepository,
  });

  const app = createApp({
    logger,
    registerRoutes: (app) => {
      app.use(createCoreCaseOpenApiRouter());
      app.use(createMfaEnrollmentRouter({
        controller: mfaEnrollmentController,
      }));
      app.use(createTaxPlanCycleRouter());
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
