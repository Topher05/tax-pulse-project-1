import { z } from "zod";

const nonNegativeRosterAmountSchema = z.number().finite().nonnegative();

export const clientRosterRowSchema = z.object({
  id: z.uuid(),
  clientName: z.string().min(1),
  filingStatus: z.string().min(1),
  ytdIncome: nonNegativeRosterAmountSchema,
  estimatedTax: nonNegativeRosterAmountSchema,
  quarterlyStatus: z.string().min(1).nullable(),
});

export const clientRosterListResponseSchema = z.array(clientRosterRowSchema);

export type ClientRosterRow = z.infer<typeof clientRosterRowSchema>;
export type ClientRosterListResponse = z.infer<
  typeof clientRosterListResponseSchema
>;
