import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useId, useState } from "react";

import { pulseNavGroups } from "./nav/navigation.ts";
import { getViewTitle } from "./nav/viewTitle.ts";

const viewAsOptions = ["Advisor", "Firm Admin", "Client"] as const;

export function AppShell() {
  const switcherLabelId = useId();
  const [selectedRole, setSelectedRole] = useState<(typeof viewAsOptions)[number]>("Advisor");
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const viewTitle = getViewTitle(pathname);

  return (
    <div className="pulse-shell">
      <aside className="pulse-sidebar" aria-label="Operator workspace">
        <div className="pulse-brand">
          <span className="pulse-brand-mark" aria-hidden="true">
            TP
          </span>
          <div>
            <span className="pulse-brand-name">TaxPulse</span>
            <span className="pulse-brand-context">Advisory</span>
          </div>
        </div>

        <nav className="pulse-nav" aria-label="Primary">
          {pulseNavGroups.map((group) => (
            <section className="pulse-nav-group" key={group.label}>
              <h2>{group.label}</h2>
              <ul>
                {group.items.map((item) => {
                  const Icon = item.icon;

                  return (
                    <li key={`${group.label}-${item.label}`}>
                      <Link
                        className="pulse-nav-link"
                        to={item.path}
                        params={item.path === "/plan-cycles/$caseId" ? { caseId: "example" } : undefined}
                        activeProps={{ "data-active": "true" }}
                        preload={false}
                      >
                        <Icon className="pulse-nav-icon" aria-hidden />
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

      <div className="pulse-workspace">
        <header className="pulse-topbar">
          <div>
            <p className="pulse-kicker">Operator Workspace</p>
            <h1>{viewTitle}</h1>
          </div>

          <div className="pulse-view-switcher" aria-labelledby={switcherLabelId}>
            <span id={switcherLabelId}>View as</span>
            <div className="pulse-segments" role="group" aria-label="Design-only view as switcher">
              {viewAsOptions.map((option) => (
                <button
                  className="pulse-segment"
                  type="button"
                  aria-pressed={selectedRole === option}
                  key={option}
                  onClick={() => {
                    setSelectedRole(option);
                  }}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </header>

        <main className="pulse-content" aria-label="Routed view content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
