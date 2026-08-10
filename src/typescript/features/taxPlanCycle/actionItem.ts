import { z } from "zod";

export const actionItemSchema = z.strictObject({
  id: z.number().int(),
  case_id: z.uuid(),
  description: z.string().min(1),
  deadline: z.iso.date(),
  completed: z.boolean(),
});

export type ActionItem = z.infer<typeof actionItemSchema>;

