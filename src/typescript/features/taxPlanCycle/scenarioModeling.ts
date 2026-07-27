import { z } from "zod";

import { scenarioTypedFiguresSchema } from "../../scenario.js";

export const scenarioModelingScenarioInputSchema = z.strictObject({
  name: z.string().min(1),
  typed_figures: scenarioTypedFiguresSchema,
});

export const scenarioModelingRequestSchema = z.strictObject({
  baseline: scenarioTypedFiguresSchema,
  scenarios: z.array(scenarioModelingScenarioInputSchema).min(2).max(5),
});

export const scenarioComparisonResultSchema = z.strictObject({
  name: z.string().min(1),
  total_tax: z.number().finite().nonnegative(),
  delta_vs_baseline: z.number(),
});

export const scenarioComparisonResponseSchema = z.array(
  scenarioComparisonResultSchema,
);

export const scenarioModelingEngineScenarioSchema = scenarioComparisonResultSchema;
export const scenarioModelingEngineResponseSchema = scenarioComparisonResponseSchema;

export type ScenarioModelingScenarioInput = z.infer<
  typeof scenarioModelingScenarioInputSchema
>;
export type ScenarioModelingRequest = z.infer<
  typeof scenarioModelingRequestSchema
>;
export type ScenarioComparisonResult = z.infer<
  typeof scenarioComparisonResultSchema
>;
export type ScenarioComparisonResponse = z.infer<
  typeof scenarioComparisonResponseSchema
>;
export type ScenarioModelingEngineScenario = ScenarioComparisonResult;
export type ScenarioModelingEngineResponse = ScenarioComparisonResponse;
