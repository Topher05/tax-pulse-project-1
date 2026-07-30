export const pulseAccessTokenStorageKey = "taxpulse_shared_jwt";

export function hasPulseAccessToken(storage?: Storage): boolean {
  try {
    const sessionStorage = storage ?? globalThis.localStorage;

    return sessionStorage.getItem(pulseAccessTokenStorageKey)?.trim() ? true : false;
  } catch {
    return false;
  }
}
