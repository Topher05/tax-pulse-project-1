import { z } from "zod";

import { scenarioSchema, scenarioTypedFiguresSchema } from "./domain/scenario.js";

const nonNegativeDecimalStringSchema = z
  .string()
  .regex(/^(?:0|[1-9]\d*)(?:\.\d+)?$/);
const signedDecimalStringSchema = z
  .string()
  .regex(/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/);

export const scenarioModelingScenarioInputSchema = z.strictObject({
  name: z.string().min(1),
  typed_figures: scenarioTypedFiguresSchema,
});

export const scenarioModelingRequestSchema = z.strictObject({
  baseline: scenarioTypedFiguresSchema,
  scenarios: z.array(scenarioModelingScenarioInputSchema).min(2).max(5),
});

export const scenarioModelingResponseSchema = z.array(scenarioSchema);

export const scenarioComparisonEngineInputScenarioSchema =
  scenarioModelingScenarioInputSchema;
export const scenarioComparisonEngineInputSchema = scenarioModelingRequestSchema;

export const scenarioComparisonEngineOutputScenarioSchema = z.strictObject({
  name: z.string().min(1),
  total_tax: nonNegativeDecimalStringSchema,
  delta_vs_baseline: signedDecimalStringSchema,
});

export const scenarioComparisonEngineOutputSchema = z.array(
  scenarioComparisonEngineOutputScenarioSchema,
);

export const scenarioComparisonResultSchema =
  scenarioComparisonEngineOutputScenarioSchema;
export const scenarioComparisonResponseSchema =
  scenarioComparisonEngineOutputSchema;
export const scenarioModelingEngineScenarioSchema =
  scenarioComparisonEngineOutputScenarioSchema;
export const scenarioModelingEngineResponseSchema =
  scenarioComparisonEngineOutputSchema;

export type ScenarioModelingScenarioInput = z.infer<
  typeof scenarioModelingScenarioInputSchema
>;
export type ScenarioModelingRequest = z.infer<
  typeof scenarioModelingRequestSchema
>;
export type ScenarioModelingResponse = z.infer<
  typeof scenarioModelingResponseSchema
>;
export type ScenarioComparisonEngineInput = ScenarioModelingRequest;
export type ScenarioComparisonEngineInputScenario = ScenarioModelingScenarioInput;
export type ScenarioComparisonEngineOutputScenario = z.infer<
  typeof scenarioComparisonEngineOutputScenarioSchema
>;
export type ScenarioComparisonEngineOutput = z.infer<
  typeof scenarioComparisonEngineOutputSchema
>;
export type ScenarioComparisonResult = ScenarioComparisonEngineOutputScenario;
export type ScenarioComparisonResponse = ScenarioComparisonEngineOutput;
export type ScenarioModelingEngineScenario =
  ScenarioComparisonEngineOutputScenario;
export type ScenarioModelingEngineResponse = ScenarioComparisonEngineOutput;
