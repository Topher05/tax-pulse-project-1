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
  // TODO: JWT check => Refresh on 401 gated by Scrum 99, this needs to be implementation reviewed then integrated post merge
  const accessToken = window.localStorage.getItem("taxpulse_shared_jwt");
  return accessToken ? `Bearer ${accessToken}` : null;
}

function getCaseApiHeaders(): HeadersInit {
  // const authorizationHeader = getSharedJwtAuthorizationHeader();

  /* if (!authorizationHeader) {
    throw new CaseApiError(401, "", "A shared JWT is required before the Pulse UI can fetch live case data.");
  }
  */
  return { // TODO: Above code is commented out for token auth, add the token to the below line for auth manually for local testing
    authorization: `Bearer your-token-for-testing`,
  };
}

export async function caseApiGetJson<T>(path: string): Promise<T> {
  const response = await fetch(new URL(path, `${getCaseApiBaseUrl()}/`).toString(), {
    headers: getCaseApiHeaders(),
  });

  if (!response.ok) {
    throw new CaseApiError(response.status, await response.text());
  }

  return (await response.json()) as T;
}
