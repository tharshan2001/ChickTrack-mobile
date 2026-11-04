import { refreshAsync, revokeAsync, TokenError, TokenTypeHint, type TokenResponse } from 'expo-auth-session';

import { CLIENT_ID, discovery } from '@/auth/config';
import { clearTokens, loadTokens, saveTokens, type Tokens } from '@/auth/token-store';

/**
 * Holds the current tokens in memory, persists them, and refreshes the
 * access token (15 min) using the rotating refresh token (30 days).
 */
let current: Tokens | null = null;
let refreshing: Promise<Tokens | null> | null = null;
const listeners = new Set<(signedIn: boolean) => void>();

const EXPIRY_MARGIN_MS = 60_000;

function notify() {
  for (const l of listeners) l(current !== null);
}

export function onSessionChange(listener: (signedIn: boolean) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function fromResponse(res: TokenResponse, previousRefresh: string | null): Tokens {
  const lifetimeSec = res.expiresIn ?? 900;
  return {
    accessToken: res.accessToken,
    // The server rotates refresh tokens; keep the old one only if none came back.
    refreshToken: res.refreshToken ?? previousRefresh,
    expiresAt: res.issuedAt * 1000 + lifetimeSec * 1000,
  };
}

export async function restoreSession(): Promise<boolean> {
  current = await loadTokens();
  return current !== null;
}

export async function startSession(res: TokenResponse) {
  current = fromResponse(res, null);
  await saveTokens(current);
  notify();
}

export async function endSession() {
  const token = current?.refreshToken;
  current = null;
  refreshing = null;
  await clearTokens();
  notify();
  if (token) {
    revokeAsync({ token, clientId: CLIENT_ID, tokenTypeHint: TokenTypeHint.RefreshToken }, discovery).catch(() => {});
  }
}

async function refresh(): Promise<Tokens | null> {
  const refreshToken = current?.refreshToken;
  if (!refreshToken) return null;
  try {
    const res = await refreshAsync({ clientId: CLIENT_ID, refreshToken }, discovery);
    current = fromResponse(res, refreshToken);
    await saveTokens(current);
    return current;
  } catch (e) {
    // The server rejected the refresh token (expired, revoked, already rotated):
    // the user must sign in again. Network failures keep the session for a retry.
    if (e instanceof TokenError) {
      await endSession();
      return null;
    }
    throw e;
  }
}

/** Single-flight refresh so parallel requests don't burn the rotating refresh token twice. */
function refreshOnce(): Promise<Tokens | null> {
  refreshing ??= refresh().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

export async function getAccessToken({ forceRefresh = false } = {}): Promise<string | null> {
  if (!current) return null;
  if (forceRefresh || Date.now() > current.expiresAt - EXPIRY_MARGIN_MS) {
    return (await refreshOnce())?.accessToken ?? null;
  }
  return current.accessToken;
}
