import type { ClientRosterRow } from "../entities/clientRoster.ts";

import {
  loaderTimeoutTestingConfig,
  type LoaderTimeoutMode,
  isLoaderTimeoutMode,
} from "./loaderTimeoutTestingConfig.ts";
import { mockedClientListings } from "./mockedClientListings.model.ts";

function getGlobalLocationSearch(): string {
  if (typeof window === "undefined") {
    return "";
  }

  return window.location.search;
}

export function getLoaderTimeoutMode(): LoaderTimeoutMode {
  // Use ?loaderMode=... to force a deterministic loader state during manual testing.
  const url = new URLSearchParams(getGlobalLocationSearch());
  const queryMode = url.get(loaderTimeoutTestingConfig.localTestingQueryParam);

  if (isLoaderTimeoutMode(queryMode)) {
    return queryMode;
  }

  return loaderTimeoutTestingConfig.defaultMode;
}

async function waitForTimeout(): Promise<void> {
  await new Promise<void>((resolve) => {
    globalThis.setTimeout(resolve, loaderTimeoutTestingConfig.timeoutMs);
  });
}

export async function loadClientRosterForLoaderTimeout(
  mode: LoaderTimeoutMode,
): Promise<readonly ClientRosterRow[]> {
  switch (mode) {
    case "success":
      return mockedClientListings;
    case "error":
      throw new Error("Client roster request failed.");
    case "error after 10 seconds":
      await waitForTimeout();
      throw new Error("Client roster request failed after the timeout window.");
    case "success after 10 seconds":
      await waitForTimeout();
      return mockedClientListings;
    case "empty":
      return [];
    case "infinite load":
      return new Promise<readonly ClientRosterRow[]>(() => undefined);
  }
}
