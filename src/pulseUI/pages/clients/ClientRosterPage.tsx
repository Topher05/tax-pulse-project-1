import { RefreshCw } from "lucide-react";

import styles from "./ClientRosterPage.module.css";
import { EmptyState } from "../../components/EmptyState.tsx";
import { DataTable } from "../../components/DataTable.tsx";
import { PanelCard } from "../../components/PanelCard.tsx";
import { ToolHeader } from "../../components/ToolHeader.tsx";
import type { ClientRosterRow } from "../../entities/clientRoster.ts";
import { useClientRosterQuery } from "../../entities/clientRosterQueries.ts";

export type { ClientRosterRow } from "../../entities/clientRoster.ts";

export interface ClientRosterScreenProps {
  clients: readonly ClientRosterRow[];
}

function ClientRosterLoadingState() {
  const skeletonRows = Array.from({ length: 4 }, (_, index) => index);

  return (
    <PanelCard
      className={styles.stateCard}
      title="Loading Client Roster"
      description="Fetching the latest roster for the current firm."
    >
      <div className={styles.skeletonTable} role="status" aria-label="Loading Client Roster">
        <span className="srOnly">Loading Client Roster</span>
        <div className={styles.skeletonHeader}>
          <span className={styles.skeletonBlock} />
          <span className={styles.skeletonBlock} />
          <span className={styles.skeletonBlock} />
          <span className={styles.skeletonBlock} />
          <span className={styles.skeletonBlock} />
          <span className={styles.skeletonBlock} />
        </div>
        {skeletonRows.map((row) => (
          <div className={styles.skeletonRow} key={row}>
            <span className={styles.skeletonBlock} />
            <span className={styles.skeletonBlock} />
            <span className={styles.skeletonBlock} />
            <span className={styles.skeletonBlock} />
            <span className={styles.skeletonBlock} />
            <span className={styles.skeletonBlock} />
          </div>
        ))}
      </div>
    </PanelCard>
  );
}

function ClientRosterEmptyState() {
  return (
    <EmptyState
      title="No clients yet"
      description="This firm does not have any clients in the roster yet."
    />
  );
}

function ClientRosterErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div role="alert">
      <EmptyState
        title="Client roster could not load"
        description={message}
        actionLabel="Retry"
        onAction={onRetry}
        icon={<RefreshCw />}
      />
    </div>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function ClientRosterScreen({ clients }: ClientRosterScreenProps) {
  const columns = [
    {
      header: "Client",
      render: (row: ClientRosterRow) => (
        <span className={styles.clientName}>{row.clientName}</span>
      ),
    },
    {
      header: "Filing",
      render: (row: ClientRosterRow) => (
        <span className={styles.filingCell}>{row.filingSummary}</span>
      ),
    },
    {
      header: "YTD Income",
      render: (row: ClientRosterRow) => formatCurrency(row.ytdIncome),
      cellClassName: styles.moneyCell,
    },
    {
      header: "Est. Tax",
      render: (row: ClientRosterRow) => formatCurrency(row.estimatedTax),
      cellClassName: styles.moneyCell,
    },
    {
      header: "Quarterly",
      render: (row: ClientRosterRow) =>
        row.quarterlyStatus ? (
          <span className={styles.quarterlyBadge}>{row.quarterlyStatus}</span>
        ) : (
          <span className={styles.quietQuarterly}>-</span>
        ),
    },
    {
      header: "",
      render: () => (
        <button className={styles.openBooksButton} type="button" disabled>
          Open Books
        </button>
      ),
      cellClassName: styles.actionCell,
    },
  ] as const;

  return (
    <div className={styles.page}>
      <ToolHeader
        title="Client Roster"
        description="Switch into a client's books with read-only access; build scenarios for them."
      />

      <PanelCard title={null} description={null}>
        <DataTable
          ariaLabel="Client roster"
          columns={columns}
          rows={clients}
          rowKey={(row) => row.id}
          emptyMessage="Client roster data will appear here once it is connected."
        />
      </PanelCard>
    </div>
  );
}

export function ClientRosterPage() {
  const clientRosterQuery = useClientRosterQuery();

  if (clientRosterQuery.isPending) {
    return <ClientRosterLoadingState />;
  }

  if (clientRosterQuery.isError) {
    return (
      <ClientRosterErrorState
        message={
          clientRosterQuery.error instanceof Error
            ? clientRosterQuery.error.message
            : "Client roster request failed."
        }
        onRetry={() => {
          void clientRosterQuery.refetch();
        }}
      />
    );
  }

  const clients = clientRosterQuery.data ?? [];

  if (clients.length === 0) {
    return <ClientRosterEmptyState />;
  }

  return <ClientRosterScreen clients={clients} />;
}
