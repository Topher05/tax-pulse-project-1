export interface ClientRosterRow {
  id: string;
  clientName: string;
  filingSummary: string;
  ytdIncome: number;
  estimatedTax: number;
  quarterlyStatus: string | null;
}
