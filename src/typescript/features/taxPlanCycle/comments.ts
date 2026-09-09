import { z } from "zod";

import { roleNameEnum } from "../../shared/database/schema.js";

const roleValues = roleNameEnum.enumValues;

export const taxPlanCycleCommentCreateRequestSchema = z
  .object({
    body: z.string().transform((value) => value.trim()).pipe(z.string().min(1)),
  })
  .strict();

export const taxPlanCycleCommentSchema = z.object({
  id: z.string().uuid(),
  case_id: z.string().uuid(),
  actor_id: z.string().uuid(),
  actor_role: z.enum(roleValues),
  author_display_name: z.string().min(1),
  body: z.string().min(1),
  created_at: z.string().datetime(),
});

export const taxPlanCycleCommentsResponseSchema = z.object({
  comments: z.array(taxPlanCycleCommentSchema),
});

export type TaxPlanCycleCommentCreateRequest = z.infer<
  typeof taxPlanCycleCommentCreateRequestSchema
>;
export type TaxPlanCycleComment = z.infer<typeof taxPlanCycleCommentSchema>;
export type TaxPlanCycleCommentsResponse = z.infer<
  typeof taxPlanCycleCommentsResponseSchema
>;
