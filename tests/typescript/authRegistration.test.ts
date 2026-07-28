import { describe, expect, test } from "vitest";

import {
  registrationAccountResponseSchema,
  registrationInitialAccountValues,
  registrationRequestSchema,
} from "../../src/typescript/index.js";

const tenantId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d01";
const userId = "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d61";

describe("registration contract", () => {
  test("accepts only the required tenant-scoped account details", () => {
    expect(
      registrationRequestSchema.parse({
        tenant_id: tenantId,
        email: "new-client@example.com",
        password: "synthetic-registration-password",
      }),
    ).toEqual({
      tenant_id: tenantId,
      email: "new-client@example.com",
      password: "synthetic-registration-password",
    });
  });

  test("rejects malformed input and caller-controlled access fields", () => {
    const result = registrationRequestSchema.safeParse({
      tenant_id: "not-a-uuid",
      email: "not-an-email",
      password: "",
      role: "Firm Admin",
      status: "active",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: ["tenant_id"] }),
          expect.objectContaining({ path: ["email"] }),
          expect.objectContaining({ path: ["password"] }),
          expect.objectContaining({ code: "unrecognized_keys" }),
        ]),
      );
    }
  });

  test("uses least-privilege initial account values", () => {
    expect(registrationInitialAccountValues).toEqual({
      role: "Client",
      status: "invited",
    });
  });

  test("defines a strict, non-sensitive public account response", () => {
    const response = registrationAccountResponseSchema.safeParse({
      id: userId,
      tenant_id: tenantId,
      email: "new-client@example.com",
      role: "Client",
      status: "invited",
      password: "synthetic-registration-password",
      passwordHash: "$argon2id$synthetic-hash",
    });

    expect(response.success).toBe(false);
    if (!response.success) {
      expect(response.error.issues).toEqual(
        expect.arrayContaining([expect.objectContaining({ code: "unrecognized_keys" })]),
      );
    }
  });
});
