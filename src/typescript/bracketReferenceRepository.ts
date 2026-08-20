import { and, asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import type { Client } from "pg";

import {
  federalTaxBracket,
  stateTaxBracket,
} from "./shared/database/schema.js";

export interface BracketReferenceLookupInput {
  filingStatus: string;
  stateCode: string;
}

export interface TaxBracketReference {
  taxYear: number;
  filingStatus: string;
  rate: string;
  lowerBound: string;
  upperBound: string | null;
}

export interface BracketReferenceLookupResult {
  federal: TaxBracketReference[];
  state: TaxBracketReference[];
}

export interface BracketReferenceRepository {
  findByFilingStatusAndState(
    input: BracketReferenceLookupInput,
  ): Promise<BracketReferenceLookupResult>;
}

export function createBracketReferenceRepository(
  client: Client,
): BracketReferenceRepository {
  const db = drizzle(client);

  return {
    async findByFilingStatusAndState({ filingStatus, stateCode }) {
      const [federal, state] = await Promise.all([
        db
          .select({
            taxYear: federalTaxBracket.taxYear,
            filingStatus: federalTaxBracket.filingStatus,
            rate: federalTaxBracket.rate,
            lowerBound: federalTaxBracket.lowerBound,
            upperBound: federalTaxBracket.upperBound,
          })
          .from(federalTaxBracket)
          .where(eq(federalTaxBracket.filingStatus, filingStatus))
          .orderBy(
            asc(federalTaxBracket.taxYear),
            asc(federalTaxBracket.lowerBound),
          ),
        db
          .select({
            taxYear: stateTaxBracket.taxYear,
            filingStatus: stateTaxBracket.filingStatus,
            rate: stateTaxBracket.rate,
            lowerBound: stateTaxBracket.lowerBound,
            upperBound: stateTaxBracket.upperBound,
          })
          .from(stateTaxBracket)
          .where(
            and(
              eq(stateTaxBracket.filingStatus, filingStatus),
              eq(stateTaxBracket.stateCode, stateCode),
            ),
          )
          .orderBy(
            asc(stateTaxBracket.taxYear),
            asc(stateTaxBracket.lowerBound),
          ),
      ]);

      return { federal, state };
    },
  };
}
