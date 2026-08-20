export const pulseAccessTokenStorageKey = "taxpulse_shared_jwt";
export const pulseRefreshTokenStorageKey = "taxpulse_refresh_token";

export interface PulseSessionTokens {
  accessToken: string;
  refreshToken?: string;
}

function getPulseStorage(storage?: Storage): Storage {
  return storage ?? globalThis.localStorage;
}

export function getPulseAccessToken(storage?: Storage): string | null {
  try {
    return getPulseStorage(storage).getItem(pulseAccessTokenStorageKey)?.trim() || null;
  } catch {
    return null;
  }
}

export function getPulseRefreshToken(storage?: Storage): string | null {
  try {
    return getPulseStorage(storage).getItem(pulseRefreshTokenStorageKey)?.trim() || null;
  } catch {
    return null;
  }
}

export function storePulseSession(tokens: PulseSessionTokens, storage?: Storage): void {
  try {
    const sessionStorage = getPulseStorage(storage);

    sessionStorage.setItem(pulseAccessTokenStorageKey, tokens.accessToken);

    if (tokens.refreshToken !== undefined) {
      sessionStorage.setItem(pulseRefreshTokenStorageKey, tokens.refreshToken);
    }
  } catch {
    return;
  }
}

export function clearPulseSession(storage?: Storage): void {
  try {
    const sessionStorage = getPulseStorage(storage);

    sessionStorage.removeItem(pulseAccessTokenStorageKey);
    sessionStorage.removeItem(pulseRefreshTokenStorageKey);
  } catch {
    return;
  }
}

export function hasPulseAccessToken(storage?: Storage): boolean {
  return getPulseAccessToken(storage) !== null;
}
