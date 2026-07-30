import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Settings2 } from "lucide-react";
import { useState } from "react";

import { useSession } from "../auth/AuthProvider.tsx";
import styles from "./AppShell.module.css";
import { pulseNavGroups } from "../shared/navigation.ts";
import { getViewTitle } from "../shared/viewTitle.ts";

export function AppShell() {
  const { logout, user } = useSession();
  const [liveCalculationEnabled, setLiveCalculationEnabled] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const viewTitle = getViewTitle(pathname);

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar} aria-label="Primary">
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">
            TP
          </span>
          <div>
            <span className={styles.brandName}>TaxPulse</span>
            <span className={styles.brandContext}>Advisory</span>
          </div>
        </div>

        <nav className={styles.nav} aria-label="Primary">
          {pulseNavGroups.map((group) => (
            <section key={group.label}>
              <h2 className={styles.navGroupHeading}>{group.label}</h2>
              <ul className={styles.navList}>
                {group.items.map((item) => {
                  const Icon = item.icon;

                  return (
                    <li key={`${group.label}-${item.label}`}>
                      <Link
                        className={styles.navLink}
                        to={item.path}
                        activeProps={{ "data-active": "true" }}
                        preload={false}
                      >
                        <Icon className={styles.navIcon} aria-hidden />
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </nav>
      </aside>

      <div className={styles.workspace}>
        <header className={styles.topbar}>
          <div className={styles.topbarHeading}>
            <h1 className={styles.topbarTitle}>{viewTitle}</h1>
          </div>

          <div className={styles.topbarControls}>
            <p className={styles.roleField}>Signed in as {user?.role}</p>

            <div className={styles.actionCluster}>
              <button
                className={`${styles.liveIndicator} ${
                  liveCalculationEnabled ? styles.liveIndicatorOn : styles.liveIndicatorOff
                }`}
                type="button"
                aria-pressed={liveCalculationEnabled}
                onClick={() => {
                  setLiveCalculationEnabled((current) => !current);
                }}
              >
                <span
                  className={`${styles.liveDot} ${
                    liveCalculationEnabled ? styles.liveDotOn : styles.liveDotOff
                  }`}
                  aria-hidden="true"
                />
                <span>Live calculation</span>
                <span className={styles.liveState}>
                  {liveCalculationEnabled ? "Live" : "Paused"}
                </span>
              </button>

              <button
                className={styles.actionButton}
                type="button"
                onClick={() => {
                  setSettingsOpen(true);
                }}
              >
                <Settings2 className={styles.actionButtonIcon} aria-hidden="true" />
                <span>Settings</span>
              </button>
              <button
                className={styles.actionButton}
                type="button"
                onClick={() => {
                  void logout().catch(() => undefined);
                }}
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        <main className={styles.content} aria-label="Routed view content">
          <Outlet />
        </main>
      </div>

      {settingsOpen ? (
        <div
          className={styles.modalOverlay}
          role="presentation"
          onClick={() => {
            setSettingsOpen(false);
          }}
        >
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-label="Settings"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <button
              className={styles.modalClose}
              type="button"
              aria-label="Close settings modal"
              onClick={() => {
                setSettingsOpen(false);
              }}
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
