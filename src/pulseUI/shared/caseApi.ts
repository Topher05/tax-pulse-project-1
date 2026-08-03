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
  const baseUrl = import.meta.env.VITE_CASE_API_BASE_URL?.trim();

  if (baseUrl && baseUrl.length > 0) {
    return baseUrl.replace(/\/+$/, "");
  }

  return "http://localhost:3000";
}

function toCaseApiUrl(path: string): string {
  return new URL(path, `${getCaseApiBaseUrl()}/`).toString();
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
