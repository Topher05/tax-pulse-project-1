import { z } from "zod";

import {
  scenarioComputedResultSchema,
  scenarioTypedFiguresSchema,
} from "./scenario.js";

export const scenarioModelingScenarioInputSchema = z.strictObject({
  name: z.string().min(1),
  typed_figures: scenarioTypedFiguresSchema,
});

export const scenarioModelingRequestSchema = z.strictObject({
  baseline: scenarioTypedFiguresSchema,
  scenarios: z.array(scenarioModelingScenarioInputSchema).min(2).max(5),
});

export const scenarioModelingEngineScenarioSchema = z.strictObject({
  name: z.string().min(1),
  typed_figures: scenarioTypedFiguresSchema,
  computed_result: scenarioComputedResultSchema,
});

export const scenarioModelingEngineResponseSchema = z.array(
  scenarioModelingEngineScenarioSchema,
);

export type ScenarioModelingScenarioInput = z.infer<
  typeof scenarioModelingScenarioInputSchema
>;
export type ScenarioModelingRequest = z.infer<
  typeof scenarioModelingRequestSchema
>;
export type ScenarioModelingEngineScenario = z.infer<
  typeof scenarioModelingEngineScenarioSchema
>;
export type ScenarioModelingEngineResponse = z.infer<
  typeof scenarioModelingEngineResponseSchema
>;
