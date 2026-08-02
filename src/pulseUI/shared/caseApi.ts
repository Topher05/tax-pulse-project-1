import {
  clearPulseSession,
  getPulseAccessToken,
  getPulseRefreshToken,
  storePulseSession,
} from "../app/authSession.ts";

export class CaseApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: string,
    message?: string,
  ) {
    super(message ?? `Case API request failed with HTTP ${status}.`);
    this.name = "CaseApiError";
  }
}

function getCaseApiBaseUrl(): string {
  const baseUrl = import.meta.env.CASE_SERVICE_BASE_URL?.trim();

  if (!baseUrl) {
    throw new Error("CASE_SERVICE_BASE_URL is required for Pulse UI case API requests.");
  }

  return baseUrl.replace(/\/+$/, "");
}
function getSharedJwtAuthorizationHeader(): string | null {
  const accessToken = getPulseAccessToken();
  return accessToken ? `Bearer ${accessToken}` : null;
}

function getCaseApiHeaders(): HeadersInit {
  const authorizationHeader = getSharedJwtAuthorizationHeader();

  if (!authorizationHeader) {
    clearPulseSession();
    throw new CaseApiError(401, "", "A shared JWT is required before the Pulse UI can fetch live case data.");
  }

  return {
    authorization: authorizationHeader,
  };
}

interface PulseRefreshResponse {
  access_token?: unknown;
  refresh_token?: unknown;
}

function toCaseApiUrl(path: string): string {
  return new URL(path, `${getCaseApiBaseUrl()}/`).toString();
}

async function refreshPulseSession(): Promise<boolean> {
  const refreshToken = getPulseRefreshToken();

  if (!refreshToken) {
    clearPulseSession();
    return false;
  }

  try {
    const response = await fetch(toCaseApiUrl("/auth/refresh"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      clearPulseSession();
      return false;
    }

    const payload = (await response.json()) as PulseRefreshResponse;

    if (typeof payload.access_token !== "string" || payload.access_token.trim().length === 0) {
      clearPulseSession();
      return false;
    }

    storePulseSession({
      accessToken: payload.access_token,
      refreshToken:
        typeof payload.refresh_token === "string" && payload.refresh_token.trim().length > 0
          ? payload.refresh_token
          : undefined,
    });

    return true;
  } catch {
    clearPulseSession();
    return false;
  }
}

async function fetchCaseApi(path: string): Promise<Response> {
  return await fetch(toCaseApiUrl(path), {
    headers: getCaseApiHeaders(),
  });
}

export async function caseApiGetJson<T>(path: string): Promise<T> {
  let response = await fetchCaseApi(path);

  if (response.status === 401) {
    const refreshed = await refreshPulseSession();

    if (refreshed) {
      response = await fetchCaseApi(path);
    }
  }

  if (response.status === 401) {
    clearPulseSession();
  }

  if (!response.ok) {
    throw new CaseApiError(response.status, await response.text());
  }

  return (await response.json()) as T;
}
