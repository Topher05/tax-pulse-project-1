import styles from "./ClientRosterPage.module.css";
import { DataTable } from "../../components/DataTable.tsx";
import { PanelCard } from "../../components/PanelCard.tsx";
import { ToolHeader } from "../../components/ToolHeader.tsx";

export interface ClientRosterRow {
  id: string;
  clientName: string;
  filingSummary: string;
  ytdIncome: number;
  estimatedTax: number;
  quarterlyStatus: string | null;
}

export interface ClientRosterScreenProps {
  clients: readonly ClientRosterRow[];
}

const prototypeClients: readonly ClientRosterRow[] = [
  {
    id: "client-avery-chen",
    clientName: "Avery Chen",
    filingSummary: "Single - 1099",
    ytdIncome: 108_500,
    estimatedTax: 32_100,
    quarterlyStatus: "Q2 due Jun 15",
  },
  {
    id: "client-sam-rivera",
    clientName: "Sam Rivera",
    filingSummary: "Single - 1099",
    ytdIncome: 142_000,
    estimatedTax: 38_240,
    quarterlyStatus: "Q2 due Jun 15",
  },
  {
    id: "client-morgan-acme",
    clientName: "Morgan Acme",
    filingSummary: "MFJ - W-2 + RSU",
    ytdIncome: 414_000,
    estimatedTax: 138_400,
    quarterlyStatus: "Q2 due Jun 15",
  },
  {
    id: "client-riley-khan",
    clientName: "Riley Khan",
    filingSummary: "HoH - W-2",
    ytdIncome: 72_500,
    estimatedTax: 11_140,
    quarterlyStatus: null,
  },
] as const;

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
  return <ClientRosterScreen clients={prototypeClients} />;
}
