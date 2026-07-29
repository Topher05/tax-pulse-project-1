import "@testing-library/jest-dom/vitest";

import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";

import { PlanCycleDetailRoute } from "../pages/taxPlanCycle/PlanCycleDetailRoute.tsx";
import { usePlanCycleDetailNavigation } from "../pages/taxPlanCycle/usePlanCycleDetailNavigation.ts";

afterEach(() => {
  cleanup();
});

describe("usePlanCycleDetailNavigation", () => {
  test("defaults to the Overview tab and first stage", () => {
    const { result } = renderHook(() => usePlanCycleDetailNavigation());

    expect(result.current.activeTab).toBe("Overview");
    expect(result.current.activeStage).toBe("Intake");
    expect(result.current.activeStageIndex).toBe(0);
  });

  test("tracks tab transitions", () => {
    const { result } = renderHook(() => usePlanCycleDetailNavigation());

    act(() => {
      result.current.setActiveTab("Scenarios");
    });

    expect(result.current.activeTab).toBe("Scenarios");

    act(() => {
      result.current.setActiveTab("Audit Trail");
    });

    expect(result.current.activeTab).toBe("Audit Trail");
  });

  test("tracks stage transitions and stepper position", () => {
    const { result } = renderHook(() =>
      usePlanCycleDetailNavigation({ initialStage: "Modeling" }),
    );

    expect(result.current.activeStage).toBe("Modeling");
    expect(result.current.activeStageIndex).toBe(2);

    act(() => {
      result.current.setActiveStage("Client Approval");
    });

    expect(result.current.activeStage).toBe("Client Approval");
    expect(result.current.activeStageIndex).toBe(4);
  });

  test("preserves unsaved comment input when switching tabs", () => {
    render(<PlanCycleDetailRoute />);

    fireEvent.click(screen.getByRole("tab", { name: "Comments" }));

    const commentBox = screen.getByRole("textbox", { name: "Comment draft" });

    fireEvent.change(commentBox, { target: { value: "Review quarterly estimate assumptions." } });
    fireEvent.click(screen.getByRole("tab", { name: "Overview" }));
    fireEvent.click(screen.getByRole("tab", { name: "Comments" }));

    expect(screen.getByRole("textbox", { name: "Comment draft" })).toHaveValue(
      "Review quarterly estimate assumptions.",
    );
  });
});
