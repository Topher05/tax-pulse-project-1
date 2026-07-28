type QueueMetric = {
  label: string;
  value: string;
  caption: string;
};

type QueueRow = {
  caseId: string;
  client: string;
  stage: string;
  owner: string;
  priority: string;
  dueDate: string;
  overdue: boolean;
};

const queueMetrics: readonly QueueMetric[] = [
  { label: "Open", value: "18", caption: "All active cycles in the queue" },
  { label: "Awaiting Review", value: "6", caption: "Ready for advisor review" },
  { label: "Overdue", value: "3", caption: "Past the due date" },
  { label: "Presented This Week", value: "7", caption: "Shared with the client team" },
];

const queueRows: readonly QueueRow[] = [
  {
    caseId: "TP-24018",
    client: "North Shore Family Office",
    stage: "Modeling",
    owner: "Caleb Latimer",
    priority: "High",
    dueDate: "Jul 10, 2026",
    overdue: true,
  },
  {
    caseId: "TP-24021",
    client: "Hawthorne Surgical Partners",
    stage: "Awaiting Review",
    owner: "Dylan Harle",
    priority: "Medium",
    dueDate: "Jul 30, 2026",
    overdue: false,
  },
  {
    caseId: "TP-24028",
    client: "Lighthouse Advisory Group",
    stage: "Presented",
    owner: "Christopher Martus",
    priority: "Low",
    dueDate: "Aug 02, 2026",
    overdue: false,
  },
  {
    caseId: "TP-24034",
    client: "Birchfield Capital",
    stage: "Modeling",
    owner: "Martins Okorie",
    priority: "High",
    dueDate: "Jul 23, 2026",
    overdue: true,
  },
];

const metricRingClasses: readonly string[] = [
  "from-sky-500 to-cyan-500",
  "from-emerald-500 to-teal-500",
  "from-rose-500 to-orange-500",
  "from-indigo-500 to-violet-500",
];

function QueueMetricCard({
  label,
  value,
  caption,
  gradient,
}: QueueMetric & { gradient: string }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</h3>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
          <p className="mt-1 text-sm text-slate-600">{caption}</p>
        </div>

        <span
          aria-hidden="true"
          className={`inline-flex h-10 w-10 shrink-0 rounded-2xl bg-gradient-to-br ${gradient} opacity-90`}
        />
      </div>
    </article>
  );
}

function OverdueBadge() {
  return (
    <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
      Overdue
    </span>
  );
}

export function PlanCycleQueuePage() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Plan Cycle Queue
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
              Open cycles at a glance
            </h2>
          </div>

          <p className="max-w-2xl text-sm leading-6 text-slate-600">
            Review ownership, stage, and due-date risk from a single queue view while
            keeping the page structure close to the wireframe.
          </p>
        </div>
      </section>

      <section aria-label="Queue metrics" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {queueMetrics.map((metric, index) => (
          <QueueMetricCard key={metric.label} {...metric} gradient={metricRingClasses[index] ?? metricRingClasses[0]!} />
        ))}
      </section>

      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">Cases in queue</h3>
            <p className="mt-1 text-sm text-slate-600">
              Tenant-scoped rows surfaced in the order advisors need them.
            </p>
          </div>
          <p className="text-sm font-medium text-slate-500">{queueRows.length} open cases</p>
        </div>

        <div className="overflow-x-auto">
          <table aria-label="Plan Cycle Queue cases" className="min-w-full border-separate border-spacing-0">
            <thead className="bg-slate-50/80">
              <tr>
                {["Case ID", "Client", "Stage", "Owner", "Priority", "Due date"].map((heading) => (
                  <th
                    key={heading}
                    scope="col"
                    className="border-b border-slate-200 px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {queueRows.map((row) => (
                <tr key={row.caseId} className="group hover:bg-slate-50/80">
                  <td className="border-b border-slate-100 px-6 py-4 text-sm font-semibold text-slate-950">
                    {row.caseId}
                  </td>
                  <td className="border-b border-slate-100 px-6 py-4 text-sm text-slate-700">
                    {row.client}
                  </td>
                  <td className="border-b border-slate-100 px-6 py-4 text-sm text-slate-700">
                    {row.stage}
                  </td>
                  <td className="border-b border-slate-100 px-6 py-4 text-sm text-slate-700">
                    {row.owner}
                  </td>
                  <td className="border-b border-slate-100 px-6 py-4 text-sm text-slate-700">
                    {row.priority}
                  </td>
                  <td className="border-b border-slate-100 px-6 py-4 text-sm text-slate-700">
                    <div className="flex items-center gap-3">
                      <span>{row.dueDate}</span>
                      {row.overdue ? <OverdueBadge /> : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
