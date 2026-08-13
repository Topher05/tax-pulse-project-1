import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import type { Client } from "pg";

import {
  taxpayerIdentifierValidation as taxpayerIdentifierValidationTable,
} from "../../../shared/database/schema.js";
import {
  taxpayerIdentifierValidationSchema,
  type TaxpayerIdentifierValidation,
  type TaxpayerIdentifierValidationResult,
  type TaxpayerIdentifierType,
} from "../taxpayerIdentifierValidation.js";

export interface TaxpayerIdentifierValidationRecordInput {
  tenantId: string;
  caseId: string;
  tinType: TaxpayerIdentifierType;
  validationResult: TaxpayerIdentifierValidationResult;
  verifiedName?: string;
  provider: "tivs";
  validatedAt?: Date;
}

export interface TaxpayerIdentifierValidationReadInput {
  tenantId: string;
  caseId: string;
}

export interface TaxpayerIdentifierValidationRepository {
  record(
    input: TaxpayerIdentifierValidationRecordInput,
  ): Promise<TaxpayerIdentifierValidation>;
  findByCaseId(
    input: TaxpayerIdentifierValidationReadInput,
  ): Promise<TaxpayerIdentifierValidation | null>;
}

function toTaxpayerIdentifierValidation(row: {
  caseId: string;
  tinType: string;
  validationResult: string;
  verifiedName: string | null;
  provider: string;
  validatedAt: Date;
}): TaxpayerIdentifierValidation {
  return taxpayerIdentifierValidationSchema.parse({
    case_id: row.caseId,
    tin_type: row.tinType,
    validation_result: row.validationResult,
    ...(row.verifiedName === null ? {} : { verified_name: row.verifiedName }),
    provider: row.provider,
    validated_at: row.validatedAt.toISOString(),
  });
}

export function createTaxpayerIdentifierValidationRepository(
  client: Client,
): TaxpayerIdentifierValidationRepository {
  const db = drizzle(client);

  return {
    async record(input) {
      const rows = await db
        .insert(taxpayerIdentifierValidationTable)
        .values({
          tenantId: input.tenantId,
          caseId: input.caseId,
          tinType: input.tinType,
          validationResult: input.validationResult,
          verifiedName: input.verifiedName ?? null,
          provider: input.provider,
          validatedAt: input.validatedAt ?? new Date(),
        })
        .onConflictDoUpdate({
          target: taxpayerIdentifierValidationTable.caseId,
          set: {
            tinType: input.tinType,
            validationResult: input.validationResult,
            verifiedName: input.verifiedName ?? null,
            provider: input.provider,
            validatedAt: input.validatedAt ?? new Date(),
          },
        })
        .returning({
          caseId: taxpayerIdentifierValidationTable.caseId,
          tinType: taxpayerIdentifierValidationTable.tinType,
          validationResult:
            taxpayerIdentifierValidationTable.validationResult,
          verifiedName: taxpayerIdentifierValidationTable.verifiedName,
          provider: taxpayerIdentifierValidationTable.provider,
          validatedAt: taxpayerIdentifierValidationTable.validatedAt,
        });

      const row = rows[0];

      if (!row) {
        throw new Error("Taxpayer identifier validation insert returned no row.");
      }

      return toTaxpayerIdentifierValidation(row);
    },

    async findByCaseId(input) {
      const rows = await db
        .select({
          caseId: taxpayerIdentifierValidationTable.caseId,
          tinType: taxpayerIdentifierValidationTable.tinType,
          validationResult:
            taxpayerIdentifierValidationTable.validationResult,
          verifiedName: taxpayerIdentifierValidationTable.verifiedName,
          provider: taxpayerIdentifierValidationTable.provider,
          validatedAt: taxpayerIdentifierValidationTable.validatedAt,
        })
        .from(taxpayerIdentifierValidationTable)
        .where(
          and(
            eq(taxpayerIdentifierValidationTable.tenantId, input.tenantId),
            eq(taxpayerIdentifierValidationTable.caseId, input.caseId),
          ),
        )
        .limit(1);

      const row = rows[0];

      return row ? toTaxpayerIdentifierValidation(row) : null;
    },
  };
}
