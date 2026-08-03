import { reloadPage } from "../shared/pageReload.ts";
import type { CSSProperties } from "react";

const pageStyle: CSSProperties = {
  display: "grid",
  placeItems: "center",
  minHeight: "100%",
  padding: "2rem 1rem",
};

const cardStyle: CSSProperties = {
  display: "grid",
  justifyItems: "center",
  gap: "1rem",
  width: "min(32rem, 100%)",
  padding: "2rem 1.5rem",
  borderRadius: "28px",
  background: "transparent",
  boxShadow: "0 14px 40px rgb(15 23 42 / 12%), 0 1px 1px rgb(15 23 42 / 6%)",
};

const iconStyle: CSSProperties = {
  display: "grid",
  placeItems: "center",
  width: "4rem",
  height: "4rem",
  color: "var(--pulse-accent)",
};

const copyStyle: CSSProperties = {
  display: "grid",
  gap: "0.4rem",
  textAlign: "center",
};

const titleStyle: CSSProperties = {
  margin: 0,
  color: "var(--pulse-ink)",
  fontSize: "1.35rem",
  lineHeight: 1.15,
  fontWeight: 800,
};

const descriptionStyle: CSSProperties = {
  margin: 0,
  color: "var(--pulse-muted)",
  fontSize: "0.95rem",
  lineHeight: 1.5,
};

const actionStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "40px",
  padding: "0 1rem",
  color: "#ffffff",
  background: "var(--pulse-accent)",
  border: 0,
  borderRadius: "12px",
  fontWeight: 700,
  cursor: "pointer",
  boxShadow: "0 6px 16px rgb(99 102 241 / 28%)",
};

function EmptyPageIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="48"
      viewBox="0 0 24 24"
      width="48"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 6v6l4 2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
    </svg>
  );
}

export function EmptyPage() {
  return (
    <section style={pageStyle} aria-label="No data generated">
      <div style={cardStyle}>
        <div style={iconStyle}>
          <EmptyPageIcon />
        </div>
        <div style={copyStyle}>
          <h2 style={titleStyle}>No data generated</h2>
          <p style={descriptionStyle}>Please try a refresh.</p>
        </div>
        <button style={actionStyle} type="button" onClick={reloadPage}>
          Refresh
        </button>
      </div>
    </section>
  );
}
