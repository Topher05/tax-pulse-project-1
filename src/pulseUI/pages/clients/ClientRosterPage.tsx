import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  sortFns,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";

import styles from "./ClientRosterPage.module.css";
import { ClientRosterSkeletonLoader } from "../../components/ClientRosterSkeletonLoader.tsx";
import { PanelCard } from "../../components/PanelCard.tsx";
import { RetryToolbar } from "../../components/RetryToolbar.tsx";
import { ToolHeader } from "../../components/ToolHeader.tsx";
import { EmptyPage } from "../EmptyPage.tsx";
import type { ClientRosterRow } from "../../entities/clientRoster.ts";
import { useClientRosterQuery } from "../../entities/clientRosterQueries.ts";
import { reloadPage } from "../../shared/pageReload.ts";

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

const clientRosterTableFeatures = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns,
});
const clientRosterColumnHelper = createColumnHelper<
  typeof clientRosterTableFeatures,
  ClientRosterRow
>();
const clientRosterColumns = clientRosterColumnHelper.columns([
  clientRosterColumnHelper.accessor("clientName", {
    header: "Client",
    cell: ({ row }) => <span className={styles.clientName}>{row.original.clientName}</span>,
    sortFn: "text",
  }),
  clientRosterColumnHelper.accessor("filingStatus", {
    header: "Filing",
    cell: ({ row }) => <span className={styles.filingCell}>{row.original.filingStatus}</span>,
    sortFn: "text",
  }),
  clientRosterColumnHelper.accessor("ytdIncome", {
    header: "YTD Income",
    cell: ({ row }) => formatCurrency(row.original.ytdIncome),
    sortFn: "basic",
  }),
  clientRosterColumnHelper.accessor("estimatedTax", {
    header: "Est. Tax",
    cell: ({ row }) => formatCurrency(row.original.estimatedTax),
    sortFn: "basic",
  }),
  clientRosterColumnHelper.accessor("quarterlyStatus", {
    header: "Quarterly",
    cell: ({ row }) =>
      row.original.quarterlyStatus ? (
        <span className={styles.quarterlyBadge}>{row.original.quarterlyStatus}</span>
      ) : (
        <span className={styles.quietQuarterly}>-</span>
      ),
    sortFn: "text",
  }),
  clientRosterColumnHelper.accessor("id", {
    id: "openBooks",
    header: "",
    cell: () => (
      <button className={styles.openBooksButton} type="button" disabled>
        Open Books
      </button>
    ),
    enableSorting: false,
  }),
]);

function sortIndicator(isSorted: false | "asc" | "desc"): string {
  if (isSorted === "asc") {
    return "Asc";
  }

  if (isSorted === "desc") {
    return "Desc";
  }

  return "Sort";
}

export function ClientRosterScreen({ clients }: ClientRosterScreenProps) {
  const table = useTable({
    columns: clientRosterColumns,
    data: clients,
    features: clientRosterTableFeatures,
  });

  return (
    <div className={styles.page}>
      <ToolHeader
        title="Client Roster"
        description="Switch into a client's books with read-only access; build scenarios for them."
      />

      <PanelCard title={null} description={null}>
        <div className={styles.tableWrap}>
          <table className={styles.table} aria-label="Client roster">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort();
                    const isSorted = header.column.getIsSorted();
                    const headerText = String(header.column.columnDef.header ?? "");

                    return (
                      <th key={header.id}>
                        {header.isPlaceholder ? null : canSort ? (
                          <button
                            className={styles.sortHeaderButton}
                            type="button"
                            aria-label={`Toggle ${headerText} sorting`}
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            <span>
                              <table.FlexRender header={header} />
                            </span>
                            <span className={styles.sortIndicator} aria-hidden="true">
                              {sortIndicator(isSorted)}
                            </span>
                          </button>
                        ) : (
                          <table.FlexRender header={header} />
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.original.id}>
                  {row.getAllCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={[
                        styles.cell,
                        cell.column.id === "ytdIncome" || cell.column.id === "estimatedTax"
                          ? styles.moneyCell
                          : undefined,
                        cell.column.id === "openBooks" ? styles.actionCell : undefined,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <table.FlexRender cell={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PanelCard>
    </div>
  );
}

export function ClientRosterPage() {
  const clientRosterQuery = useClientRosterQuery();

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
          onRetry={reloadPage}
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
