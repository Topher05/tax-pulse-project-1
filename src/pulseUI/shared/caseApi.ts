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
  return import.meta.env.CASE_SERVICE_BASE_URL?.trim().replace(/\/+$/, "") ?? "";
}

function toCaseApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const baseUrl = getCaseApiBaseUrl();

  if (!baseUrl) {
    return normalizedPath;
  }

  return new URL(normalizedPath, `${baseUrl}/`).toString();
}

export async function caseApiGetJson<T>(
  path: string,
  fetcher: typeof fetch = fetch,
): Promise<T> {
  const response = await fetcher(toCaseApiUrl(path), {
    credentials: "include",
  });

  if (!response.ok) {
    throw new CaseApiError(response.status, await response.text());
  }

  return (await response.json()) as T;
}
