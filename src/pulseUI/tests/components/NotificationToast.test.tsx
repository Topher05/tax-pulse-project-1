import "@testing-library/jest-dom/vitest";

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import {
  NotificationTheme,
  createErrorNotificationMessage,
  createInfoNotificationMessage,
  createSuccessNotificationMessage,
} from "../../entities/notificationMessage.ts";
import {
  NotificationToastProvider,
  useNotificationToast,
} from "../../components/NotificationToast.tsx";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function NotificationToastHarness() {
  const { showNotification, dismissNotification } = useNotificationToast();

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          showNotification(
            createSuccessNotificationMessage("Transition completed.", "Cycle updated"),
          );
        }}
      >
        Show success
      </button>
      <button
        type="button"
        onClick={() => {
          showNotification(createInfoNotificationMessage("Placeholder action.", "Hold"));
        }}
      >
        Show info
      </button>
      <button
        type="button"
        onClick={() => {
          dismissNotification();
        }}
      >
        Dismiss
      </button>
    </div>
  );
}

describe("notification message helpers", () => {
  test("creates notification messages with the default display duration", () => {
    const notification = createErrorNotificationMessage("Problem", "Header");

    expect(notification).toMatchObject({
      theme: NotificationTheme.Error,
      message: "Problem",
      messageHeader: "Header",
      displayTimeMs: 3000,
    });
    expect(notification.id).toEqual(expect.any(String));
  });

  test("preserves explicit duration and icon overrides", () => {
    const icon = <span data-testid="override-icon" />;
    const notification = createInfoNotificationMessage("Body", "Header", 5000, icon);

    expect(notification).toMatchObject({
      theme: NotificationTheme.Info,
      message: "Body",
      messageHeader: "Header",
      displayTimeMs: 5000,
    });
    expect(notification.icon).toBe(icon);
  });
});

describe("NotificationToastProvider", () => {
  test("renders the toast host and auto-dismisses the active notification", async () => {
    vi.useFakeTimers();

    render(
      <NotificationToastProvider>
        <NotificationToastHarness />
      </NotificationToastProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Show success" }));

    expect(screen.getByRole("status")).toHaveTextContent("Cycle updated");
    expect(screen.getByRole("status")).toHaveTextContent("Transition completed.");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    expect(screen.getByRole("status")).toHaveTextContent("Transition completed.");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(220);
    });

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  test("dismisses the toast when the close button is clicked", async () => {
    vi.useFakeTimers();

    render(
      <NotificationToastProvider>
        <NotificationToastHarness />
      </NotificationToastProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Show info" }));

    expect(screen.getByRole("status")).toHaveTextContent("Hold");
    expect(screen.getByRole("status")).toHaveTextContent("Placeholder action.");

    fireEvent.click(screen.getByRole("button", { name: "Close notification" }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(220);
    });

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
