const quarterPlanningPeriodPattern = /^(\d{4})-Q([1-4])$/i;
const uuidPattern = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
const prefixedIdentifierPattern =
  /\b(case|cycle|record|document|section|user|advisor|client|firm-admin|platform)[-_][a-z0-9][a-z0-9_-]*\b/gi;

export function formatPlanningPeriod(value: string | null | undefined): string {
  const planningPeriod = value?.trim();
  if (!planningPeriod) return "Planning period unavailable";

  const quarterMatch = quarterPlanningPeriodPattern.exec(planningPeriod);
  return quarterMatch ? `Q${quarterMatch[2]} ${quarterMatch[1]}` : planningPeriod;
}

export function formatTaxPlanLabel(input: {
  clientName?: string | null;
  planningPeriod?: string | null;
  cycleLabel?: string | null;
}): string {
  const suppliedLabel = input.cycleLabel?.trim();
  if (suppliedLabel) return suppliedLabel;

  const clientName = input.clientName?.trim() || "Client unavailable";
  return `${clientName} · ${formatPlanningPeriod(input.planningPeriod)} Tax Plan`;
}

export function buildTaxPlanCycleLabels(
  cycles: readonly {
    id: string;
    clientKey?: string | null;
    clientName?: string | null;
    planningPeriod?: string | null;
    earliestEventAt?: Date | string | null;
  }[],
): Map<string, string> {
  const groups = new Map<string, typeof cycles>();
  for (const cycle of cycles) {
    const clientKey = cycle.clientKey?.trim() || cycle.clientName?.trim().toLowerCase() || "missing";
    const periodKey = cycle.planningPeriod?.trim().toLowerCase() || "missing";
    const key = `${clientKey}\u0000${periodKey}`;
    groups.set(key, [...(groups.get(key) ?? []), cycle]);
  }

  const labels = new Map<string, string>();
  for (const groupedCycles of groups.values()) {
    const firstCycle = groupedCycles[0]!;
    const base = formatTaxPlanLabel(firstCycle);
    if (groupedCycles.length === 1) {
      labels.set(firstCycle.id, base);
      continue;
    }

    const eventDate = (cycle: (typeof groupedCycles)[number]): string => {
      if (!cycle.earliestEventAt) return "";
      const date = cycle.earliestEventAt instanceof Date
        ? cycle.earliestEventAt
        : new Date(cycle.earliestEventAt);
      return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
    };
    const sorted = [...groupedCycles].sort((left, right) =>
      eventDate(left).localeCompare(eventDate(right)) || left.id.localeCompare(right.id),
    );
    const dates = sorted.map(eventDate);
    const canUseDates = dates.every(Boolean) && new Set(dates).size === dates.length;
    sorted.forEach((cycle, index) => {
      const suffix = canUseDates ? `Created ${dates[index]}` : `Plan ${index + 1}`;
      labels.set(cycle.id, `${base} · ${suffix}`);
    });
  }

  return labels;
}

export function displayPersonName(value: string | null | undefined): string {
  const name = value?.trim();
  if (
    !name ||
    /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(name) ||
    /^(?:user|advisor|client|firm-admin|platform)[-_]/i.test(name) ||
    name.toLowerCase() === "unknown"
  ) return "User unavailable";
  return name;
}

export function displayClientName(value: string | null | undefined): string {
  const name = value?.trim();
  if (!name || /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(name)) return "Client unavailable";
  return name;
}

export function removeTechnicalIdentifiers(value: string): string {
  return value
    .replace(uuidPattern, "record")
    .replace(prefixedIdentifierPattern, (identifier, prefix: string) => {
      if (/^(?:case|cycle)$/i.test(prefix)) return "tax plan";
      if (/^(?:user|advisor|client|firm-admin|platform)$/i.test(prefix)) return "user";
      return prefix.toLowerCase();
    });
}

export function displayDocumentTitle(value: string | null | undefined): string {
  const title = value?.trim();
  if (!title) return "Document unavailable";
  const displayed = removeTechnicalIdentifiers(title);
  return displayed === "document" || displayed === "record" ? "Document unavailable" : displayed;
}

export function displaySectionPath(value: string | null | undefined): string {
  const path = value?.trim();
  if (!path) return "Section unavailable";
  const displayed = removeTechnicalIdentifiers(path);
  return displayed === "section" || displayed === "record" ? "Section unavailable" : displayed;
}
