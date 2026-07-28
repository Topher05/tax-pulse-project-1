import "@testing-library/jest-dom/vitest";

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import {
  PlanCycleQueueStateBoundary,
  type PlanCycleQueueLoader,
} from "../../components/taxPlanCycle/PlanCycleQueueStateBoundary.tsx";

afterEach(() => {
  cleanup();
});

function createDeferredQueue() {
  let resolveQueue: (items: readonly unknown[]) => void = () => undefined;
  let rejectQueue: (error: unknown) => void = () => undefined;
  const promise = new Promise<readonly unknown[]>((resolve, reject) => {
    resolveQueue = resolve;
    rejectQueue = reject;
  });

  return { promise, resolveQueue, rejectQueue };
}

describe("Plan Cycle Queue request states", () => {
  test("renders a loading skeleton while the queue request is in flight", () => {
    const queueRequest = createDeferredQueue();

    render(
      <PlanCycleQueueStateBoundary
        loadQueue={() => queueRequest.promise}
        renderSuccess={() => <p>Queue ready</p>}
      />,
    );

    expect(
      screen.getByRole("status", { name: "Loading Plan Cycle Queue" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Loading Plan Cycle Queue" }),
    ).toHaveAttribute("aria-busy", "true");
  });

  test("renders the empty state when the tenant has no open cycles", async () => {
    render(
      <PlanCycleQueueStateBoundary
        loadQueue={async () => []}
        renderSuccess={() => <p>Queue ready</p>}
      />,
    );

    expect(
      await screen.findByRole("heading", { name: "No open plan cycles" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("This tenant has no open cycles right now."),
    ).toBeInTheDocument();
  });

  test("renders an error state with retry when the queue request fails", async () => {
    render(
      <PlanCycleQueueStateBoundary
        loadQueue={async () => {
          throw new Error("Read model unavailable.");
        }}
        renderSuccess={() => <p>Queue ready</p>}
      />,
    );

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Queue could not load" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Read model unavailable.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  test("retries the queue request and can recover after failure", async () => {
    const loadQueue = vi
      .fn<PlanCycleQueueLoader>()
      .mockRejectedValueOnce(new Error("Temporary queue failure."))
      .mockResolvedValueOnce([]);

    render(
      <PlanCycleQueueStateBoundary
        loadQueue={loadQueue}
        renderSuccess={() => <p>Queue ready</p>}
      />,
    );

    expect(await screen.findByRole("alert")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(
      await screen.findByRole("heading", { name: "No open plan cycles" }),
    ).toBeInTheDocument();
    expect(loadQueue).toHaveBeenCalledTimes(2);
  });

  test("renders the success branch when the queue request has data", async () => {
    const queueRequest = createDeferredQueue();

    render(
      <PlanCycleQueueStateBoundary
        loadQueue={() => queueRequest.promise}
        renderSuccess={() => <p>Queue ready</p>}
      />,
    );

    await act(async () => {
      queueRequest.resolveQueue([{ case_id: "case-placeholder" }]);
      await queueRequest.promise;
    });

    await waitFor(() => {
      expect(
        screen.queryByRole("status", { name: "Loading Plan Cycle Queue" }),
      ).not.toBeInTheDocument();
    });
    expect(await screen.findByText("Queue ready")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
