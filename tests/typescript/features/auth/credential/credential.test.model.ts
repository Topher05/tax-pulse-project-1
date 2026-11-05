import { z } from "zod";
import { credentialRows as seededCredentialRows } from "../../../../../src/typescript/shared/database/seed.model.js";

export const expectedCredentialColumns = ["id", "userId", "passwordHash"];
export const expectedCredentialColumnTypes = {
  id: "character varying",
  userId: "uuid",
  passwordHash: "character varying",
} as const;

const legacyCredentialRows = [
  {
    id: "cm7zq8f4k0000a1b2c3d4e5f6",
    userId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d61",
    passwordHash:
      "$argon2id$v=19$m=65536,t=3,p=4$c2FsdC1vbmUtZm9yLWF1dGgtMQ$YXV0aC1oYXNoLW9uZS0wMQ",
  },
  {
    id: "cm7zq8f4k0001a1b2c3d4e5f6",
    userId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d62",
    passwordHash:
      "$argon2id$v=19$m=65536,t=3,p=4$LB6kDJl7/qVUyjm9pG8b/A$bHlhCBx1qF+pWKaE4NoQP5eog9iaqryE/Oba3m4zF4Y",
  },
  {
    id: "cm7zq8f4k0002a1b2c3d4e5f6",
    userId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d63",
    passwordHash:
      "$argon2id$v=19$m=65536,t=3,p=4$c2FsdC1vbmUtZm9yLWF1dGgtMw$YXV0aC1oYXNoLW9uZS0wMw",
  },
  {
    id: "cm7zq8f4k0003a1b2c3d4e5f6",
    userId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d64",
    passwordHash:
      "$argon2id$v=19$m=65536,t=3,p=4$c2FsdC1vbmUtZm9yLWF1dGgtNA$YXV0aC1oYXNoLW9uZS0wNA",
  },
  {
    id: "cm7zq8f4k0004a1b2c3d4e5f6",
    userId: "018d6c1a-3f9b-7c28-8d1a-0f4a3b8c9d65",
    passwordHash:
      "$argon2id$v=19$m=65536,t=3,p=4$c2FsdC1vbmUtZm9yLWF1dGgtNQ$YXV0aC1oYXNoLW9uZS0wNQ",
  },
] as const;

export const credentialRows = seededCredentialRows;

export const expectedCredentialRows = credentialRows.map((row) => ({
  id: row.id,
  userId: row.userId,
  passwordHash: row.passwordHash,
}));

export const credentialRowSchema = z.object({
  id: z.string().regex(/^c[a-z0-9]{24}$/),
  userId: z.uuid(),
  passwordHash: z.string().regex(/^\$argon2id\$/),
});

export const credentialRowsSchema = z.array(credentialRowSchema);
