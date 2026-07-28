export class CoreCaseApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: string,
    message?: string,
  ) {
    super(message ?? `Core Case Service request failed with HTTP ${status}.`);
    this.name = "CoreCaseApiError";
  }
}

function getCoreCaseApiBaseUrl(): string {
  const baseUrl = import.meta.env.VITE_CORE_CASE_BASE_URL?.trim();

  if (baseUrl && baseUrl.length > 0) {
    return baseUrl.replace(/\/+$/, "");
  }

  return window.location.origin;
}

function getSharedJwtAuthorizationHeader(): string | null {
  // TODO: JWT check => Refresh on 401 gated by Scrum 99, this needs to be implementation reviewed then integrated post merge
  // const accessToken = window.localStorage.getItem("taxpulse_shared_jwt");
  // return accessToken ? `Bearer ${accessToken}` : null;
  return `Bearer aaa`;
}

function getCoreCaseHeaders(): HeadersInit {
  const authorizationHeader = getSharedJwtAuthorizationHeader();

  if (!authorizationHeader) {
    throw new CoreCaseApiError(
      401,
      "",
      "A shared JWT is required before the Pulse UI can fetch live case data.",
    );
  }

  return {
    authorization: authorizationHeader,
  };
}

export async function coreCaseApiGetJson<T>(path: string): Promise<T> {
  const response = await fetch(`${getCoreCaseApiBaseUrl()}${path}`, {
    headers: getCoreCaseHeaders(),
  });

  if (!response.ok) {
    throw new CoreCaseApiError(response.status, await response.text());
  }

  return (await response.json()) as T;
}
