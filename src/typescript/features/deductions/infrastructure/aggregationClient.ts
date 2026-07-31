import type { ClientDeductionAggregationPayload } from "../repositories/deduction.js";

export interface AggregationDataSource {
  fetchCaseAggregationPayload(
    caseId: string,
  ): Promise<ClientDeductionAggregationPayload>;
}

export interface TaxPulseAggregationClientOptions {
  timeoutMs?: number;
}

const defaultAggregationTimeoutMs = 1_000;

export class AggregationTimeoutError extends Error {
  readonly caseId: string;
  readonly timeoutMs: number;

  constructor(caseId: string, timeoutMs: number) {
    super(
      `Aggregation source timed out for case ${caseId} after ${timeoutMs}ms.`,
    );
    this.name = "AggregationTimeoutError";
    this.caseId = caseId;
    this.timeoutMs = timeoutMs;
  }
}

export class TaxPulseAggregationClient {
  private readonly timeoutMs: number;

  constructor(
    private readonly dataSource: AggregationDataSource,
    options: TaxPulseAggregationClientOptions = {},
  ) {
    this.timeoutMs = options.timeoutMs ?? defaultAggregationTimeoutMs;
  }

  async fetchAggregationPayload(
    caseId: string,
  ): Promise<ClientDeductionAggregationPayload> {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const sourcePromise = this.dataSource.fetchCaseAggregationPayload(caseId);
    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      timeoutId = setTimeout(() => {
        reject(new AggregationTimeoutError(caseId, this.timeoutMs));
      }, this.timeoutMs);
    });

    try {
      return await Promise.race([sourcePromise, timeoutPromise]);
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
