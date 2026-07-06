import type { ClientIncomeDeductionAggregationPayload } from "./aggregationPayload.js";

export interface AggregationDataSource {
  fetchClientAggregationPayload(
    clientId: string,
  ): Promise<ClientIncomeDeductionAggregationPayload>;
}

export interface TaxPulseAggregationClientOptions {
  timeoutMs?: number;
}

const defaultAggregationTimeoutMs = 1_000;

export class AggregationTimeoutError extends Error {
  readonly clientId: string;
  readonly timeoutMs: number;

  constructor(clientId: string, timeoutMs: number) {
    super(
      `Aggregation source timed out for client ${clientId} after ${timeoutMs}ms.`,
    );
    this.name = "AggregationTimeoutError";
    this.clientId = clientId;
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
    clientId: string,
  ): Promise<ClientIncomeDeductionAggregationPayload> {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const sourcePromise = this.dataSource.fetchClientAggregationPayload(clientId);
    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      timeoutId = setTimeout(() => {
        reject(new AggregationTimeoutError(clientId, this.timeoutMs));
      }, this.timeoutMs);
    });

    try {
      return await Promise.race([sourcePromise, timeoutPromise]);
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
