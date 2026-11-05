const promptInjectionSignals = [
  {
    id: "override_instructions",
    pattern:
      /\b(ignore|disregard|forget|bypass|override|replace)\b[\s\S]{0,80}\b(previous|prior|above|system|developer|hidden|internal)\b[\s\S]{0,40}\b(instruction|instructions|prompt|policy|policies)\b/i,
  },
  {
    id: "reveal_hidden_instructions",
    pattern:
      /\b(reveal|show|print|dump|leak|expose|display|return|repeat)\b[\s\S]{0,80}\b(system prompt|system instructions|developer prompt|developer instructions|hidden instructions|internal instructions|secret prompt|chain of thought|cot)\b/i,
  },
  {
    id: "cross_tenant_request",
    pattern:
      /(?:\b(other tenant|another tenant|cross[\s-]?tenant|all tenants|every tenant|tenant-alpha|tenant-beta)\b[\s\S]{0,80}\b(data|records|chunks|citations|documents|context|recommendations|instructions)\b|\b(data|records|chunks|citations|documents|context|recommendations|instructions)\b[\s\S]{0,80}\b(other tenant|another tenant|cross[\s-]?tenant|all tenants|every tenant|tenant-alpha|tenant-beta)\b)/i,
  },
  {
    id: "role_spoofing",
    pattern: /(^|\n|\r)\s*(system|assistant|developer)\s*[:>]|<\/?(system|assistant|developer)>/i,
  },
] as const;

const base64SegmentPattern = /\b(?:[A-Za-z0-9+/]{20,}={0,2})\b/g;

export interface AssistPromptSafetyInput {
  recommendation: string;
  question?: string;
}

export interface AssistPromptSafetyResult {
  safe: boolean;
  matchedSignals: readonly string[];
}

export function detectAssistPromptInjection(
  input: AssistPromptSafetyInput,
): AssistPromptSafetyResult {
  const matchedSignals = new Set<string>();
  const textsToInspect = [input.recommendation, input.question ?? ""].flatMap((value) => {
    const normalizedSource = normalizeAssistSourceText(value);

    return [normalizeAssistText(normalizedSource), ...decodeCandidatePayloads(normalizedSource)];
  });

  for (const text of textsToInspect) {
    for (const signal of promptInjectionSignals) {
      if (signal.pattern.test(text)) {
        matchedSignals.add(signal.id);
      }
    }
  }

  return {
    safe: matchedSignals.size === 0,
    matchedSignals: [...matchedSignals].sort(),
  };
}

export function normalizeAssistText(value: string): string {
  return normalizeAssistSourceText(value).toLowerCase();
}

function normalizeAssistSourceText(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/\r\n/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .trim()
}

function decodeCandidatePayloads(value: string): string[] {
  const candidates = value.match(base64SegmentPattern) ?? [];
  const decoded: string[] = [];

  for (const candidate of candidates) {
    try {
      const normalized = candidate.replaceAll(/\s+/g, "");
      const decodedValue = Buffer.from(normalized, "base64").toString("utf8");

      if (decodedValue.length < 12 || /\uFFFD/.test(decodedValue)) {
        continue;
      }

      decoded.push(normalizeAssistText(decodedValue));
    } catch {
      continue;
    }
  }

  return decoded;
}
