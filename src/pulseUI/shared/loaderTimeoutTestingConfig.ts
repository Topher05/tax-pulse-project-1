export const loaderTimeoutModes = [
  "success",
  "error",
  "error after 10 seconds",
  "success after 10 seconds",
  "empty",
  "infinite load",
] as const;

export type LoaderTimeoutMode = (typeof loaderTimeoutModes)[number];

export const loaderTimeoutTestingConfig = {
  defaultMode: "success" as LoaderTimeoutMode,
  localTestingQueryParam: "loaderMode",
  timeoutMs: 10_000,
} as const;

export function isLoaderTimeoutMode(value: string | null | undefined): value is LoaderTimeoutMode {
  return typeof value === "string" && loaderTimeoutModes.includes(value as LoaderTimeoutMode);
}
