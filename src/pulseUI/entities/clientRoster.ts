export interface ClientRosterRow {
  id: string;
  clientName: string;
  filingStatus: string;
  ytdIncome: number;
  estimatedTax: number;
  quarterlyStatus: string | null;
}
