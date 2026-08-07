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

type CaseApiFetcher = typeof fetch;

type CaseApiJsonRequestInit = Omit<RequestInit, "body"> & {
  body?: unknown;
};

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

async function caseApiFetch(
  path: string,
  init: RequestInit = {},
  fetcher: CaseApiFetcher = fetch,
): Promise<Response> {
  return await fetcher(toCaseApiUrl(path), {
    ...init,
    credentials: "same-origin",
  });
}

async function parseCaseApiJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new CaseApiError(response.status, await response.text());
  }

  return (await response.json()) as T;
}

export async function caseApiGetJson<T>(
  path: string,
  fetcher: CaseApiFetcher = fetch,
): Promise<T> {
  const response = await caseApiFetch(path, {}, fetcher);

  return await parseCaseApiJson<T>(response);
}

export async function caseApiSendJson<T>(
  path: string,
  init: CaseApiJsonRequestInit,
  fetcher: CaseApiFetcher = fetch,
): Promise<T> {
  const { body, headers: initHeaders, ...requestInit } = init;
  const headers = new Headers(initHeaders);

  if (body !== undefined && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const response = await caseApiFetch(
    path,
    {
      ...requestInit,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    },
    fetcher,
  );

  return await parseCaseApiJson<T>(response);
}

export async function caseApiPostJson<T>(
  path: string,
  body: unknown,
  fetcher: CaseApiFetcher = fetch,
): Promise<T> {
  return await caseApiSendJson<T>(path, { method: "POST", body }, fetcher);
}
