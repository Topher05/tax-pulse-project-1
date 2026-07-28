import "@testing-library/jest-dom/vitest";

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import {
  PlanCycleQueueStateBoundary,
  type PlanCycleQueueLoader,
} from "../../planCycles/PlanCycleQueueRoute.tsx";

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

    render(<PlanCycleQueueStateBoundary loadQueue={() => queueRequest.promise} />);

    expect(
      screen.getByRole("status", { name: "Loading Plan Cycle Queue" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Loading Plan Cycle Queue" }),
    ).toHaveAttribute("aria-busy", "true");
  });

  test("renders the empty state when the tenant has no open cycles", async () => {
    render(<PlanCycleQueueStateBoundary loadQueue={async () => []} />);

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

    render(<PlanCycleQueueStateBoundary loadQueue={loadQueue} />);

    expect(await screen.findByRole("alert")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(
      await screen.findByRole("heading", { name: "No open plan cycles" }),
    ).toBeInTheDocument();
    expect(loadQueue).toHaveBeenCalledTimes(2);
  });

  test("does not render SCRUM-93 queue content for non-empty successful data", async () => {
    const queueRequest = createDeferredQueue();

    render(<PlanCycleQueueStateBoundary loadQueue={() => queueRequest.promise} />);

    await act(async () => {
      queueRequest.resolveQueue([{ case_id: "case-placeholder" }]);
      await queueRequest.promise;
    });

    await waitFor(() => {
      expect(
        screen.queryByRole("status", { name: "Loading Plan Cycle Queue" }),
      ).not.toBeInTheDocument();
    });
    expect(
      screen.queryByRole("heading", { name: "No open plan cycles" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText("case-placeholder")).not.toBeInTheDocument();
  });
});
