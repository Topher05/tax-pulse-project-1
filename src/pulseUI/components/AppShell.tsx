import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Settings2 } from "lucide-react";
import { useState } from "react";

import { useSession } from "../auth/AuthProvider.tsx";
import { pulseNavGroups } from "../shared/navigation.ts";
import { getViewTitle } from "../shared/viewTitle.ts";

export function AppShell() {
  const { logout, user } = useSession();
  const [liveCalculationEnabled, setLiveCalculationEnabled] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const viewTitle = getViewTitle(pathname);

  return (
    <div className="pulseShell">
      <aside className="pulseSidebar" aria-label="Primary">
        <div className="pulseBrand">
          <span className="pulseBrandMark" aria-hidden="true">
            TP
          </span>
          <div>
            <span className="pulseBrandName">TaxPulse</span>
            <span className="pulseBrandContext">Advisory</span>
          </div>
        </div>

        <nav className="pulseNav" aria-label="Primary">
          {pulseNavGroups.map((group) => (
            <section className="pulseNavGroup" key={group.label}>
              <h2>{group.label}</h2>
              <ul>
                {group.items.map((item) => {
                  const Icon = item.icon;

                  return (
                    <li key={`${group.label}-${item.label}`}>
                      <Link className="pulseNavLink" to={item.path} activeProps={{ "data-active": "true" }} preload={false}>
                        <Icon className="pulseNavIcon" aria-hidden />
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

      <div className="pulseWorkspace">
        <header className="pulseTopbar">
          <div className="pulseTopbarHeading">
            <h1>{viewTitle}</h1>
          </div>

          <div className="pulseTopbarControls">
            <p className="pulseRoleField">Signed in as {user?.role}</p>

            <div className="pulseTopbarActions">
              <button
                className={`pulseLiveIndicator ${liveCalculationEnabled ? "is-live" : "is-offline"}`}
                type="button"
                aria-pressed={liveCalculationEnabled}
                onClick={() => {
                  setLiveCalculationEnabled((current) => !current);
                }}
              >
                <span className="pulseLiveIndicatorDot" aria-hidden="true" />
                <span>Live calculation</span>
                <span className="pulseLiveIndicatorState">
                  {liveCalculationEnabled ? "Live" : "Paused"}
                </span>
              </button>

              <button
                className="pulseActionButton"
                type="button"
                onClick={() => {
                  setSettingsOpen(true);
                }}
              >
                <Settings2 aria-hidden="true" />
                <span>Settings</span>
              </button>
              <button
                className="pulseActionButton"
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

        <main className="pulseContent" aria-label="Routed view content">
          <Outlet />
        </main>
      </div>

      {settingsOpen ? (
        <div
          className="pulseModalOverlay"
          role="presentation"
          onClick={() => {
            setSettingsOpen(false);
          }}
        >
          <div
            className="pulseModal"
            role="dialog"
            aria-modal="true"
            aria-label="Settings"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <button
              className="pulseModalClose"
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
