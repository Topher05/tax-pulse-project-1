import { describe, expect, test, vi } from "vitest";

import {
  AuthRequestError,
  beginMfaEnrollment,
  confirmMfaEnrollment,
  confirmPasswordReset,
  createBrowserAuthClient,
  registerAccount,
  requestPasswordReset,
} from "../../auth/authClient.ts";

const credentials = {
  workspaceSlug: "summit-ridge-tax",
  email: "advisor@example.test",
  password: "synthetic-password",
};

const tenantId = "tenant-synthetic-001";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("browser auth client", () => {
  test("starts MFA enrollment with the registered tenant and user identifiers", async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      jsonResponse({
        provisioning_uri:
          "otpauth://totp/TaxPulse%20Advisory:new-client%40example.test?secret=FAKEBASE32SECRETFAKEBASE32SECRET&issuer=TaxPulse%20Advisory",
      }, 202),
    );

    await expect(
      beginMfaEnrollment(
        {
          tenantId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01",
          userId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d61",
        },
        fetcher,
      ),
    ).resolves.toEqual({
      provisioningUri:
        "otpauth://totp/TaxPulse%20Advisory:new-client%40example.test?secret=FAKEBASE32SECRETFAKEBASE32SECRET&issuer=TaxPulse%20Advisory",
    });

    expect(fetcher).toHaveBeenCalledWith(
      "/mfa/enroll",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({
          tenant_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01",
          user_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d61",
        }),
      }),
    );
  });

  test("confirms MFA enrollment with a six-digit code", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => jsonResponse({ enrolled: true }));

    await expect(
      confirmMfaEnrollment(
        {
          tenantId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01",
          userId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d61",
          code: "123456",
        },
        fetcher,
      ),
    ).resolves.toBe(true);

    expect(fetcher).toHaveBeenCalledWith(
      "/mfa/enroll/confirm",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({
          tenant_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01",
          user_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d61",
          code: "123456",
        }),
      }),
    );
  });

  test("posts registration details to create an account", async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      jsonResponse({
        id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d61",
        tenant_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01",
        email: "new-client@example.test",
        role: "Client",
        status: "invited",
      }, 201),
    );

    await expect(
      registerAccount(
        {
          tenantId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01",
          email: "new-client@example.test",
          password: "synthetic-password",
        },
        fetcher,
      ),
    ).resolves.toEqual({
      id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d61",
      tenantId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01",
      email: "new-client@example.test",
      role: "Client",
      status: "invited",
    });

    expect(fetcher).toHaveBeenCalledWith(
      "/auth/register",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({
          tenant_id: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01",
          email: "new-client@example.test",
          password: "synthetic-password",
        }),
      }),
    );
  });

  test("surfaces duplicate registration details from Problem Details", async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      jsonResponse({
        type: "https://taxpulse.example/problems/email-already-registered",
        title: "Email Already Registered",
        status: 409,
        detail: "An account with this email is already registered for this tenant.",
        code: "EMAIL_ALREADY_REGISTERED",
      }, 409),
    );

    await expect(
      registerAccount(
        {
          tenantId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01",
          email: "existing-client@example.test",
          password: "synthetic-password",
        },
        fetcher,
      ),
    ).rejects.toMatchObject({
      name: "AuthRequestError",
      status: 409,
      message: "An account with this email is already registered for this tenant.",
    } satisfies Partial<AuthRequestError>);
  });

  test("posts credentials to begin the MFA login flow", async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      jsonResponse({
        status: "mfa_challenge_required",
        tenant_id: tenantId,
        email: credentials.email,
        user_id: "user-synthetic-001",
      }, 202),
    );

    const challenge = await createBrowserAuthClient(fetcher).login(credentials);

    expect(challenge).toEqual({
      tenantId,
      email: credentials.email,
      userId: "user-synthetic-001",
    });
    expect(fetcher).toHaveBeenCalledWith(
      "/auth/login",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({
          workspace_slug: credentials.workspaceSlug,
          email: credentials.email,
          password: credentials.password,
        }),
      }),
    );
  });

  test("completes MFA and reads only browser-visible token fields", async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      jsonResponse({
        access_token: "signed.access.jwt",
        token_type: "Bearer",
        expires_in: 900,
        refresh_expires_in: 2_592_000,
      }),
    );
    const client = createBrowserAuthClient(fetcher);

    const result = await client.completeMfaLogin(
      { tenantId, email: credentials.email, userId: "user-synthetic-001" },
      "123456",
    );

    expect(result).toEqual({
      access_token: "signed.access.jwt",
      token_type: "Bearer",
      expires_in: 900,
      refresh_expires_in: 2_592_000,
    });
    expect(fetcher).toHaveBeenCalledWith(
      "/auth/login/mfa",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  test("uses cookie-backed refresh and logout endpoints", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          access_token: "refreshed.access.jwt",
          token_type: "Bearer",
          expires_in: 900,
          refresh_expires_in: 2_592_000,
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const client = createBrowserAuthClient(fetcher);

    await expect(client.refreshSession()).resolves.toMatchObject({
      access_token: "refreshed.access.jwt",
    });
    await expect(client.logout()).resolves.toBeUndefined();
    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      "/auth/refresh",
      expect.objectContaining({ method: "POST", credentials: "include" }),
    );
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      "/auth/logout",
      expect.objectContaining({ method: "POST", credentials: "include" }),
    );
  });

  test("rejects invalid auth responses rather than admitting a malformed session", async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      jsonResponse({ access_token: "signed.access.jwt", token_type: "Bearer" }),
    );

    await expect(createBrowserAuthClient(fetcher).refreshSession()).rejects.toMatchObject({
      name: "AuthRequestError",
      status: 502,
    } satisfies Partial<AuthRequestError>);
  });

  test("submits email to request password reset", async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      jsonResponse({ accepted: true }, 202),
    );

    await expect(
      requestPasswordReset({ email: "user@example.test" }, fetcher),
    ).resolves.toBe(true);

    expect(fetcher).toHaveBeenCalledWith(
      "/auth/forgot-password",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ email: "user@example.test" }),
      }),
    );
  });

  test("submits token and new password to confirm password reset", async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      jsonResponse({ reset: true }, 200),
    );

    await expect(
      confirmPasswordReset(
        { token: "test-token-123", newPassword: "brand-new-password" },
        fetcher,
      ),
    ).resolves.toBe(true);

    expect(fetcher).toHaveBeenCalledWith(
      "/auth/reset-password",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({
          token: "test-token-123",
          new_password: "brand-new-password",
        }),
      }),
    );
  });
});
