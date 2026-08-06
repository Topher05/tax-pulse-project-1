import type { ClientRosterRow } from "../entities/clientRoster.ts";

export const mockedClientListings = [
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
  {
    id: "client-jordan-park",
    clientName: "Jordan Park",
    filingSummary: "MFJ - K-1 + W-2",
    ytdIncome: 265_800,
    estimatedTax: 76_200,
    quarterlyStatus: "Q2 due Jun 15",
  },
  {
    id: "client-marco-ellis",
    clientName: "Marco Ellis",
    filingSummary: "Single - W-2",
    ytdIncome: 96_400,
    estimatedTax: 22_880,
    quarterlyStatus: null,
  },
] as const satisfies readonly ClientRosterRow[];
