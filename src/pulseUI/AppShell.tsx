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
    <div className="pulseShell">
      <aside className="pulseSidebar" aria-label="Operator workspace">
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
                      <Link
                        className="pulseNavLink"
                        to={item.path}
                        params={item.path === "/plan-cycles/$caseId" ? { caseId: "example" } : undefined}
                        activeProps={{ "data-active": "true" }}
                        preload={false}
                      >
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
          <div>
            <p className="pulseKicker">Operator Workspace</p>
            <h1>{viewTitle}</h1>
          </div>

          <div className="pulseViewSwitcher" aria-labelledby={switcherLabelId}>
            <span id={switcherLabelId}>View as</span>
            <div className="pulseSegments" role="group" aria-label="Design-only view as switcher">
              {viewAsOptions.map((option) => (
                <button
                  className="pulseSegment"
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

        <main className="pulseContent" aria-label="Routed view content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
