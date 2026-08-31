import type {
  IncomeEventCreate,
  IncomeEventRow,
} from "./incomeEvents.js";
import type {
  IncomeEventListInput,
  IncomeEventRepository,
} from "./repository.js";

export interface IncomeEventServiceCreateInput
  extends IncomeEventListInput,
    IncomeEventCreate {}

export interface IncomeEventService {
  listByCase(input: IncomeEventListInput): Promise<IncomeEventRow[] | null>;
  create(input: IncomeEventServiceCreateInput): Promise<IncomeEventRow | null>;
}

export interface CreateIncomeEventServiceOptions {
  clock?: () => Date;
}

export function createIncomeEventService(
  repository: IncomeEventRepository,
  options: CreateIncomeEventServiceOptions = {},
): IncomeEventService {
  const clock = options.clock ?? (() => new Date());

  return {
    listByCase: (input) => repository.listByCase(input),
    create: (input) =>
      repository.create({
        ...input,
        date: clock().toISOString().slice(0, 10),
      }),
  };
}
