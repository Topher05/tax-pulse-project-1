import type { ReactNode } from "react";

import styles from "./DataTable.module.css";

export interface DataTableColumn<T> {
  header: string;
  render: (row: T) => ReactNode;
  cellClassName?: string;
}

export interface DataTableProps<T> {
  ariaLabel: string;
  columns: readonly DataTableColumn<T>[];
  rows: readonly T[];
  rowKey: (row: T) => string;
  emptyMessage?: string;
}

export function DataTable<T>({
  ariaLabel,
  columns,
  rows,
  rowKey,
  emptyMessage = "No records to display yet.",
}: DataTableProps<T>) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table} aria-label={ariaLabel}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.header}>{column.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className={styles.emptyCell} colSpan={columns.length}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={rowKey(row)}>
                {columns.map((column) => (
                  <td
                    key={column.header}
                    className={[styles.cell, column.cellClassName].filter(Boolean).join(" ")}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
