import { once } from "node:events";
import type { AddressInfo } from "node:net";

import type { RequestHandler } from "express";
import { describe, expect, test, vi } from "vitest";

import {
  ProblemHttpError,
  createApp,
  createAuthRouter,
  createLogger,
  createMfaEnrollmentController,
  createMfaEnrollmentRouter,
  type MfaEnrollmentRecord,
  type MfaEnrollmentController,
  type MfaEnrollmentRepository,
  type MfaTenantUser,
  type MfaTotpProvider,
  type PasswordAuthenticator,
  type TenantLoginResolver,
  type MfaValidationErrorResponse,
} from "../../src/typescript/index.js";

const silentLogger = createLogger({ level: "silent" });

const tenantId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01";
const userId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d61";
const userEmail = "alex@example.com";
const validCode = "123456";
const tenantLoginHostname = "north-shore-advisors.taxpulse.example";
const tenantLoginResolver: TenantLoginResolver = {
  async findActiveTenantByLoginSlug(loginSlug) {
    return loginSlug === "north-shore-advisors" ? { tenantId, loginSlug } : null;
  },
};

class InMemoryMfaEnrollmentRepository implements MfaEnrollmentRepository {
  readonly tenantUser: MfaTenantUser = {
    id: userId,
    email: userEmail,
    tenantId,
    role: "Firm Admin",
  };
  enrollment: MfaEnrollmentRecord | null = null;

  async findTenantUser(input: {
    tenantId: string;
    userId: string;
  }): Promise<MfaTenantUser | null> {
    if (input.tenantId === tenantId && input.userId === userId) {
      return this.tenantUser;
    }

    return null;
  }

  async findEnrollment(): Promise<MfaEnrollmentRecord | null> {
    return this.enrollment;
  }

  async savePendingEnrollment(input: {
    userId: string;
    totpSecret: string;
  }): Promise<void> {
    this.enrollment = {
      userId: input.userId,
      totpSecret: input.totpSecret,
      isEnrolled: false,
    };
  }

  async markEnrolled(input: {
    userId: string;
  }): Promise<void> {
    if (this.enrollment?.userId !== input.userId) {
      return;
    }

    this.enrollment = {
      ...this.enrollment,
      isEnrolled: true,
    };
  }
}

const fakeTotpProvider: MfaTotpProvider = {
  generateSecret: () => "FAKEBASE32SECRETFAKEBASE32SECRET",
  generateProvisioningUri: ({ accountLabel, secret }) =>
    `otpauth://totp/TaxPulse%20Advisory:${encodeURIComponent(
      accountLabel,
    )}?secret=${secret}&issuer=TaxPulse%20Advisory`,
  verifyCode: async ({ code }) => code === validCode,
};

const attachAuthenticatedContext: RequestHandler = (req, _res, next) => {
  (req as typeof req & { tenant: { id: string } }).tenant = {
    id: tenantId,
  };
  (req as typeof req & { user: { id: string } }).user = {
    id: userId,
  };
  next();
};

async function withRouteServer(
  input: {
    controller: MfaEnrollmentController;
    attachContext?: boolean;
  },
  run: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const app = createApp({
    logger: silentLogger,
    registerRoutes: (app) => {
      if (input.attachContext ?? false) {
        app.use(attachAuthenticatedContext);
      }

      app.use(createMfaEnrollmentRouter({ controller: input.controller }));
    },
  });

  const server = app.listen(0);
  await once(server, "listening");

  try {
    const address = server.address() as AddressInfo;
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    server.close();
    await once(server, "close");
  }
}

describe("createMfaEnrollmentRouter", () => {
  test("passes valid enroll requests to the controller layer", async () => {
    const enroll = vi.fn<MfaEnrollmentController["enroll"]>(() =>
      Promise.resolve({
        provisioning_uri:
          "otpauth://totp/TaxPulse%20Advisory:alex%40example.com?secret=FAKEBASE32SECRETFAKEBASE32SECRET&issuer=TaxPulse%20Advisory",
      }),
    );
    const confirm = vi.fn<MfaEnrollmentController["confirm"]>(() =>
      Promise.resolve({ enrolled: true }),
    );

    await withRouteServer({ controller: { enroll, confirm } }, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/mfa/enroll`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantId,
          user_id: userId,
        }),
      });

      expect(response.status).toBe(202);
      await expect(response.json()).resolves.toEqual({
        provisioning_uri:
          "otpauth://totp/TaxPulse%20Advisory:alex%40example.com?secret=FAKEBASE32SECRETFAKEBASE32SECRET&issuer=TaxPulse%20Advisory",
      });
      expect(enroll).toHaveBeenCalledWith({ tenantId, userId });
      expect(confirm).not.toHaveBeenCalled();
    });
  });

  test("passes valid confirmation requests to the controller layer", async () => {
    const enroll = vi.fn<MfaEnrollmentController["enroll"]>(() =>
      Promise.resolve({
        provisioning_uri:
          "otpauth://totp/TaxPulse%20Advisory:alex%40example.com?secret=FAKEBASE32SECRETFAKEBASE32SECRET&issuer=TaxPulse%20Advisory",
      }),
    );
    const confirm = vi.fn<MfaEnrollmentController["confirm"]>(() =>
      Promise.resolve({ enrolled: true }),
    );

    await withRouteServer({ controller: { enroll, confirm } }, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/mfa/enroll/confirm`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantId,
          user_id: userId,
          code: validCode,
        }),
      });

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ enrolled: true });
      expect(confirm).toHaveBeenCalledWith({ tenantId, userId, code: validCode });
      expect(enroll).not.toHaveBeenCalled();
    });
  });

  test("returns 400 Problem Details for malformed enroll bodies", async () => {
    const enroll = vi.fn<MfaEnrollmentController["enroll"]>(() =>
      Promise.resolve({
        provisioning_uri:
          "otpauth://totp/TaxPulse%20Advisory:alex%40example.com?secret=FAKEBASE32SECRETFAKEBASE32SECRET&issuer=TaxPulse%20Advisory",
      }),
    );
    const confirm = vi.fn<MfaEnrollmentController["confirm"]>(() =>
      Promise.resolve({ enrolled: true }),
    );

    await withRouteServer({ controller: { enroll, confirm } }, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/mfa/enroll`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: "123456" }),
      });
      const body = (await response.json()) as MfaValidationErrorResponse;

      expect(response.status).toBe(400);
      expect(response.headers.get("content-type")).toContain(
        "application/problem+json",
      );
      expect(body).toMatchObject({
        type: "https://taxpulse.example/problems/validation-error",
        title: "Validation Error",
        status: 400,
        code: "VALIDATION_ERROR",
      });
      expect(body.issues).toEqual([
        expect.objectContaining({ code: "unrecognized_keys" }),
      ]);
      expect(enroll).not.toHaveBeenCalled();
    });
  });

  test("uses middleware context when request body identifiers are absent", async () => {
    const enroll = vi.fn<MfaEnrollmentController["enroll"]>(() =>
      Promise.resolve({
        provisioning_uri:
          "otpauth://totp/TaxPulse%20Advisory:alex%40example.com?secret=FAKEBASE32SECRETFAKEBASE32SECRET&issuer=TaxPulse%20Advisory",
      }),
    );
    const confirm = vi.fn<MfaEnrollmentController["confirm"]>(() =>
      Promise.resolve({ enrolled: true }),
    );

    await withRouteServer(
      { controller: { enroll, confirm }, attachContext: true },
      async (baseUrl) => {
        const response = await fetch(`${baseUrl}/mfa/enroll`, {
          method: "POST",
        });

        expect(response.status).toBe(202);
        expect(enroll).toHaveBeenCalledWith({ tenantId, userId });
      },
    );
  });

  test("returns 400 Problem Details for malformed confirmation codes", async () => {
    const enroll = vi.fn<MfaEnrollmentController["enroll"]>(() =>
      Promise.resolve({
        provisioning_uri:
          "otpauth://totp/TaxPulse%20Advisory:alex%40example.com?secret=FAKEBASE32SECRETFAKEBASE32SECRET&issuer=TaxPulse%20Advisory",
      }),
    );
    const confirm = vi.fn<MfaEnrollmentController["confirm"]>(() =>
      Promise.resolve({ enrolled: true }),
    );

    await withRouteServer({ controller: { enroll, confirm } }, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/mfa/enroll/confirm`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: "abc" }),
      });
      const body = (await response.json()) as MfaValidationErrorResponse;

      expect(response.status).toBe(400);
      expect(body).toMatchObject({
        type: "https://taxpulse.example/problems/validation-error",
        title: "Validation Error",
        status: 400,
        code: "VALIDATION_ERROR",
      });
      expect(body.issues).toEqual([
        expect.objectContaining({ path: ["code"] }),
      ]);
      expect(confirm).not.toHaveBeenCalled();
    });
  });

  test("returns 401 when authenticated context is missing", async () => {
    const enroll = vi.fn<MfaEnrollmentController["enroll"]>(() =>
      Promise.resolve({
        provisioning_uri:
          "otpauth://totp/TaxPulse%20Advisory:alex%40example.com?secret=FAKEBASE32SECRETFAKEBASE32SECRET&issuer=TaxPulse%20Advisory",
      }),
    );
    const confirm = vi.fn<MfaEnrollmentController["confirm"]>(() =>
      Promise.resolve({ enrolled: true }),
    );

    await withRouteServer(
      { controller: { enroll, confirm }, attachContext: false },
      async (baseUrl) => {
        const response = await fetch(`${baseUrl}/mfa/enroll`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({}),
        });

        expect(response.status).toBe(401);
        await expect(response.json()).resolves.toMatchObject({
          type: "https://taxpulse.example/problems/authentication-required",
          title: "Authentication Required",
          status: 401,
        });
        expect(enroll).not.toHaveBeenCalled();
      },
    );
  });

  test("returns shared Problem Details when the controller rejects a code", async () => {
    const enroll = vi.fn<MfaEnrollmentController["enroll"]>(() =>
      Promise.resolve({
        provisioning_uri:
          "otpauth://totp/TaxPulse%20Advisory:alex%40example.com?secret=FAKEBASE32SECRETFAKEBASE32SECRET&issuer=TaxPulse%20Advisory",
      }),
    );
    const confirm = vi.fn<MfaEnrollmentController["confirm"]>(() => {
      throw new ProblemHttpError({
        type: "https://taxpulse.example/problems/mfa-invalid-code",
        title: "Invalid MFA Code",
        status: 401,
        detail: "The submitted MFA code is invalid.",
      });
    });

    await withRouteServer({ controller: { enroll, confirm } }, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/mfa/enroll/confirm`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantId,
          user_id: userId,
          code: validCode,
        }),
      });

      expect(response.status).toBe(401);
      expect(response.headers.get("content-type")).toContain(
        "application/problem+json",
      );
      await expect(response.json()).resolves.toEqual({
        type: "https://taxpulse.example/problems/mfa-invalid-code",
        title: "Invalid MFA Code",
        status: 401,
        detail: "The submitted MFA code is invalid.",
      });
      expect(confirm).toHaveBeenCalledWith({ tenantId, userId, code: validCode });
    });
  });

  test("enrolls and confirms MFA after password login returns challenge identifiers", async () => {
    const repository = new InMemoryMfaEnrollmentRepository();
    const controller = createMfaEnrollmentController({
      repository,
      totpProvider: fakeTotpProvider,
    });
    const authenticatePassword = vi.fn<PasswordAuthenticator>(async () => ({
      status: "mfa_challenge_required",
      tenantId,
      email: userEmail,
      userId,
    }));
    const app = createApp({
      logger: silentLogger,
      registerRoutes: (app) => {
        app.use(createAuthRouter({ authenticatePassword, tenantLoginResolver }));
        app.use(createMfaEnrollmentRouter({ controller }));
      },
    });
    app.set("trust proxy", true);

    const server = app.listen(0);
    await once(server, "listening");

    try {
      const address = server.address() as AddressInfo;
      const baseUrl = `http://127.0.0.1:${address.port}`;
      const loginResponse = await fetch(`${baseUrl}/auth/login`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-forwarded-host": tenantLoginHostname,
        },
        body: JSON.stringify({
          email: userEmail,
          password: "correct-password",
        }),
      });
      const challenge = (await loginResponse.json()) as {
        tenant_id: string;
        user_id: string;
      };

      expect(loginResponse.status).toBe(202);

      const enrollResponse = await fetch(`${baseUrl}/mfa/enroll`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tenant_id: challenge.tenant_id,
          user_id: challenge.user_id,
        }),
      });

      expect(enrollResponse.status).toBe(202);
      await expect(enrollResponse.json()).resolves.toEqual({
        provisioning_uri:
          "otpauth://totp/TaxPulse%20Advisory:alex%40example.com?secret=FAKEBASE32SECRETFAKEBASE32SECRET&issuer=TaxPulse%20Advisory",
      });
      expect(repository.enrollment).toEqual({
        userId,
        totpSecret: "FAKEBASE32SECRETFAKEBASE32SECRET",
        isEnrolled: false,
      });

      const confirmResponse = await fetch(`${baseUrl}/mfa/enroll/confirm`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tenant_id: challenge.tenant_id,
          user_id: challenge.user_id,
          code: validCode,
        }),
      });

      expect(confirmResponse.status).toBe(200);
      await expect(confirmResponse.json()).resolves.toEqual({ enrolled: true });
      expect(repository.enrollment?.isEnrolled).toBe(true);
    } finally {
      server.close();
      await once(server, "close");
    }
  });
});
