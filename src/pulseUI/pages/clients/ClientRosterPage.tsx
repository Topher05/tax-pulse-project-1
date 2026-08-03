import styles from "./ClientRosterPage.module.css";
import { ClientRosterSkeletonLoader } from "../../components/ClientRosterSkeletonLoader.tsx";
import { DataTable } from "../../components/DataTable.tsx";
import { PanelCard } from "../../components/PanelCard.tsx";
import { RetryToolbar } from "../../components/RetryToolbar.tsx";
import { ToolHeader } from "../../components/ToolHeader.tsx";
import { EmptyPage } from "../EmptyPage.tsx";
import type { ClientRosterRow } from "../../entities/clientRoster.ts";
import { useClientRosterQuery } from "../../entities/clientRosterQueries.ts";

export type { ClientRosterRow } from "../../entities/clientRoster.ts";

export interface ClientRosterScreenProps {
  clients: readonly ClientRosterRow[];
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

  // TODO: Remove mock integration before PR.
  if (clientRosterQuery.isPending) {
    return <ClientRosterSkeletonLoader />;
  }

  if (clientRosterQuery.isError) {
    return (
      <div role="alert">
        <RetryToolbar
          title="Client roster could not load"
          description={
            clientRosterQuery.error instanceof Error
              ? clientRosterQuery.error.message
              : "Client roster request failed."
          }
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  const clients = clientRosterQuery.data ?? [];

  if (clients.length === 0) {
    return <EmptyPage />;
  }

  return <ClientRosterScreen clients={clients} />;
}
