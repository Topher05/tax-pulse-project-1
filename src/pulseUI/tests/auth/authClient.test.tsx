import { describe, expect, test, vi } from "vitest";

import {
  AuthRequestError,
  createBrowserAuthClient,
  registerAccount,
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
});
