import { z } from "zod";

export const taxpayerIdentifierTypeValues = ["ein", "ssn"] as const;
export const taxpayerIdentifierValidationResultValues = [
  "match",
  "tin_not_issued",
  "tin_not_found",
  "name_mismatch",
] as const;

export const taxpayerIdentifierTypeSchema = z.enum(taxpayerIdentifierTypeValues);
export const taxpayerIdentifierValidationResultSchema = z.enum(
  taxpayerIdentifierValidationResultValues,
);

export const taxpayerIdentifierInputSchema = z.strictObject({
  tin: z.string().trim().min(1),
  tin_type: z.enum(["EIN", "SSN"]),
  legal_name: z.string().trim().min(1),
});

export const taxpayerIdentifierValidationSchema = z.strictObject({
  case_id: z.uuid(),
  tin_type: taxpayerIdentifierTypeSchema,
  validation_result: taxpayerIdentifierValidationResultSchema,
  verified_name: z.string().min(1).optional(),
  provider: z.literal("tivs"),
  validated_at: z.iso.datetime(),
});

export type TaxpayerIdentifierInput = z.infer<
  typeof taxpayerIdentifierInputSchema
>;
export type TaxpayerIdentifierType = z.infer<typeof taxpayerIdentifierTypeSchema>;
export type TaxpayerIdentifierValidationResult = z.infer<
  typeof taxpayerIdentifierValidationResultSchema
>;
export type TaxpayerIdentifierValidation = z.infer<
  typeof taxpayerIdentifierValidationSchema
>;
