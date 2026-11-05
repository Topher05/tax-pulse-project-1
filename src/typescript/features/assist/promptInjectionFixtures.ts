import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { z } from "zod";

const assistPromptInjectionFixtureSchema = z.strictObject({
  id: z.string().trim().min(1),
  recommendation: z.string().trim().min(1),
  question: z.string().trim().min(1).optional(),
});

const assistPromptInjectionFixtureSetSchema = z
  .array(assistPromptInjectionFixtureSchema)
  .min(1);

export type AssistPromptInjectionFixture = z.infer<
  typeof assistPromptInjectionFixtureSchema
>;

export function loadAssistPromptInjectionFixtures(): AssistPromptInjectionFixture[] {
  const fixturePath = fileURLToPath(
    new URL("../../../../data/corpus/security/prompt-injection-cases.json", import.meta.url),
  );

  return assistPromptInjectionFixtureSetSchema.parse(
    JSON.parse(readFileSync(fixturePath, "utf8")),
  );
}
