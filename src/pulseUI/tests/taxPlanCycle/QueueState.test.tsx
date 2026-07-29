import "@testing-library/jest-dom/vitest";

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { PlanCycle } from "../../pages/taxPlanCycle/PlanCycle.tsx";

afterEach(() => {
  cleanup();
});

function createDeferredQueue() {
  let resolveQueue: (items: readonly unknown[]) => void = () => undefined;
  const promise = new Promise<readonly unknown[]>((resolve) => {
    resolveQueue = resolve;
  });

  return { promise, resolveQueue };
}

describe("Plan Cycle Queue request states", () => {
  test("renders a loading skeleton while the queue request is in flight", () => {
    const queueRequest = createDeferredQueue();

    render(<PlanCycle loadQueue={() => queueRequest.promise} renderSuccess={() => <p>Queue ready</p>} />);

    expect(screen.getByRole("status", { name: "Loading Plan Cycle Queue" })).toBeInTheDocument();
  });

  test("renders the empty state when the tenant has no open cycles", async () => {
    render(<PlanCycle loadQueue={async () => []} renderSuccess={() => <p>Queue ready</p>} />);

    expect(await screen.findByRole("heading", { name: "No open plan cycles" })).toBeInTheDocument();
  });

  test("renders an error state with retry when the queue request fails", async () => {
    render(
      <PlanCycle
        loadQueue={async () => {
          throw new Error("Read model unavailable.");
        }}
        renderSuccess={() => <p>Queue ready</p>}
      />,
    );

    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });

  test("retries the queue request and can recover after failure", async () => {
    const loadQueue = vi
      .fn<() => Promise<readonly unknown[]>>()
      .mockRejectedValueOnce(new Error("Temporary queue failure."))
      .mockResolvedValueOnce([]);

    render(<PlanCycle loadQueue={loadQueue} renderSuccess={() => <p>Queue ready</p>} />);

    await screen.findByRole("alert");

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByRole("heading", { name: "No open plan cycles" })).toBeInTheDocument();
  });

  test("renders the success branch when the queue request has data", async () => {
    const queueRequest = createDeferredQueue();

    render(<PlanCycle loadQueue={() => queueRequest.promise} renderSuccess={() => <p>Queue ready</p>} />);

    await act(async () => {
      queueRequest.resolveQueue([{ case_id: "case-placeholder" }]);
      await queueRequest.promise;
    });

    expect(await screen.findByText("Queue ready")).toBeInTheDocument();
  });
});
