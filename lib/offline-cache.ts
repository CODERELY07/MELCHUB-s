import { isAxiosError } from "axios";

// Last-known borrower data, kept in localStorage so the portal still shows
// something useful with no connection. This is a read-only fallback: it is
// only ever written from a successful server response, and only ever read
// when the network itself is unreachable (never on a 4xx/5xx).

const PREFIX = "melchub_cache:";
const SYNCED_KEY = `${PREFIX}__synced_at`;

export function readCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? null : (JSON.parse(raw) as T);
  } catch {
    return null;
  }
}

export function writeCache(key: string, data: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(data));
    localStorage.setItem(SYNCED_KEY, new Date().toISOString());
  } catch {
    // Storage full or blocked — the cache is best-effort.
  }
}

export function lastSyncedAt(): string | null {
  try {
    return localStorage.getItem(SYNCED_KEY);
  } catch {
    return null;
  }
}

/** Wipes every cached entry — call on logout so the next person on this device sees none of it. */
export function clearCache(): void {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}

/** True when the failure was "couldn't reach the server" rather than a real HTTP response. */
export function isNetworkError(err: unknown): boolean {
  return !(isAxiosError(err) && err.response);
}

/**
 * Fetch fresh data and remember it; if the network is unreachable, fall back
 * to the last remembered copy. Real HTTP errors (401, 422, 500…) still throw.
 */
export async function cachedGet<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  try {
    const data = await fetcher();
    writeCache(key, data);
    return data;
  } catch (err) {
    if (isNetworkError(err)) {
      const cached = readCache<T>(key);
      if (cached !== null) return cached;
    }
    throw err;
  }
}
