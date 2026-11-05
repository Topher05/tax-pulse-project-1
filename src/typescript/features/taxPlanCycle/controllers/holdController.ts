import type { TaxPlanCycle } from "../taxPlanCycle.js";
import type {
  TaxPlanCycleHoldInput,
  TaxPlanCycleReadInput,
  TaxPlanCycleRepository,
} from "../repositories/repository.js";
import type { TaxPlanCycleQueueCacheInvalidator } from "../infrastructure/queueCache.js";
import {
  emitObservabilityEvent,
  type StructuredLogger,
} from "../../../shared/cloud-logger/observability.js";

export interface TaxPlanCycleHoldControllerInput extends TaxPlanCycleHoldInput {
  actor: string;
}

export interface TaxPlanCycleHoldController {
  setHoldStatus(
    input: TaxPlanCycleHoldControllerInput,
  ): Promise<TaxPlanCycle | null> | TaxPlanCycle | null;
  findByCaseId(
    input: TaxPlanCycleReadInput,
  ): Promise<TaxPlanCycle | null> | TaxPlanCycle | null;
}

export interface TaxPlanCycleHoldControllerOptions {
  queueCacheInvalidator?: TaxPlanCycleQueueCacheInvalidator;
  telemetryLogger?: StructuredLogger;
}

export function createTaxPlanCycleHoldController(
  repository: TaxPlanCycleRepository,
  options: TaxPlanCycleHoldControllerOptions = {},
): TaxPlanCycleHoldController {
  const telemetryLogger = options.telemetryLogger ?? console;

  return {
    async setHoldStatus(input) {
      const startedAt = Date.now();
      emitObservabilityEvent(telemetryLogger, "info", "hold status change started", {
        service: "core-case-service",
        layer: "workflow",
        operation: "hold_status_change",
        tenant_id: input.tenantId,
        case_id: input.caseId,
        actor: input.actor,
        on_hold: input.onHold,
        outcome: "started",
        metric_name: "tax_plan_cycle.hold_status_change.count",
        metric_value: 1,
        metric_unit: "Count",
      });

      const updated = await repository.setHoldStatus(input);

      if (updated && options.queueCacheInvalidator) {
        try {
          await options.queueCacheInvalidator.invalidateAfterHoldChange({
            tenantId: input.tenantId,
            caseId: input.caseId,
          });
        } catch {
          // Queue cache is best-effort infrastructure.
        }
      }

      emitObservabilityEvent(telemetryLogger, "info", "hold status change completed", {
        service: "core-case-service",
        layer: "workflow",
        operation: "hold_status_change",
        tenant_id: input.tenantId,
        case_id: input.caseId,
        actor: input.actor,
        on_hold: input.onHold,
        outcome: updated ? "success" : "not_found",
        duration_ms: Date.now() - startedAt,
        metric_name: "tax_plan_cycle.hold_status_change.duration_ms",
        metric_value: Date.now() - startedAt,
        metric_unit: "Milliseconds",
      });

      return updated;
    },
    findByCaseId: (input) => repository.findByCaseId(input),
  };
}

/** @deprecated Legacy fallback stub. Inject a real repository-backed controller instead. */
export const taxPlanCycleHoldController: TaxPlanCycleHoldController = {
  setHoldStatus: () => null,
  findByCaseId: () => null,
};
