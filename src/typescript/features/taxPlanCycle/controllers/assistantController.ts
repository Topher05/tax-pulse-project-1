import { z } from "zod";

export const taxPlanDetailsAssistantRequestSchema = z.strictObject({});

export type TaxPlanDetailsAssistant = z.infer<
  typeof taxPlanDetailsAssistantRequestSchema
>;

export interface TaxPlanDetailsAssistantController {
  assist(
    input: {
      tenantId: string;
      actor: string;
    } & TaxPlanDetailsAssistant,
  ): Promise<{ message: string }> | { message: string };
}

export function createTaxPlanDetailsAssistantController(): TaxPlanDetailsAssistantController {
  return {
    assist: () => ({ message: "Hello TaxPulse" }),
  };
}

export const taxPlanDetailsAssistantController =
  createTaxPlanDetailsAssistantController();
